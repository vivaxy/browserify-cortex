/**
 * @since 2015-11-22 13:43
 * @author vivaxy
 */

'use strict';

const fs = require('fs');
const path = require('path');

const git = require('nodegit');
const log = require('log-util');
const rimraf = require('rimraf');
const semver = require('semver');
const request = require('request');
const browserify = require('browserify');
const usageTracker = require('usage-tracker');

const packageJson = require('../package.json');
const findMain = require('../fallback/main.js');
const findRepository = require('../fallback/repository.js');
const findRepositoryUrl = require('../fallback/repository-url.js');

const cwd = process.cwd();
const clone = git.Clone.clone;
const reset = git.Reset.reset;
const browserifyCortexVersion = packageJson.version;
const usageTrackerId = packageJson['usage-tracker-id'].split('').reverse().join('');

const SUCCESS_CODE = 200;
const NOT_FOUND_INDEX = -1;
const CORTEX_JSON = 'cortex.json';
const PACKAGE_JSON = 'package.json';
const OUTPUT_FILE_NAME = 'bundle.js';
const WORKING_DIRECTORY = 'browserify-cortex';
const REGISTRY_SERVER = 'http://registry.cortexjs.dp/';

const cortexJson = require(path.join(cwd, CORTEX_JSON));

let tree = {};

const checkDone = () => {
    let count = 0;
    for (let dep in tree) {
        if (!tree[dep].done) {
            count++;
        }
    }
    return count === 0;
};

const getDependencies = (dependencies) => {
    for (let dep in dependencies) {
        if (!tree[dep]) {
            let registry = REGISTRY_SERVER + dep;
            tree[dep] = {};
            log.info('resolving dependencies:', dep);
            request(registry, (error, response, body) => {
                if (!error && response.statusCode === SUCCESS_CODE) {
                    let registryResult = JSON.parse(body);
                    let name = registryResult.name;
                    let versions = registryResult.versions;
                    let newDependent = {};
                    for (let version in versions) {
                        if (semver.satisfies(version, dependencies[name])) {
                            let versionJson = versions[version];
                            let repository = findRepository[name];
                            // fallback
                            if (!repository) {
                                repository = versionJson.repository;
                            }
                            // fallback again
                            if (!repository) {
                                repository = registryResult.repository;
                            }
                            if (!repository) {
                                log.error('repository not found:', name);
                                if (isDebug) {
                                    usageTracker.send({
                                        'registry not found': name
                                    });
                                }
                            } else {
                                // log.debug('repository', name, JSON.stringify(repository));
                                let repositoryUrl = repository.url;
                                // fallback
                                if (!repositoryUrl) {
                                    repositoryUrl = findRepositoryUrl[name];
                                }
                                if (!repositoryUrl) {
                                    log.error('repository url not found:', name);
                                    if (isDebug) {
                                        usageTracker.send({
                                            'repository url not found': name
                                        });
                                    }
                                } else {
                                    let main = versionJson.main;
                                    if (!versionJson.main) {
                                        main = findMain[name];
                                    }
                                    newDependent = {
                                        done: false,
                                        name,
                                        version,
                                        gitHead: versionJson.gitHead,
                                        // clone url as `git@github.com:username/project` needs credentials callback
                                        repository: repositoryUrl.replace('git://', 'http://').replace('git@github.com:', 'https://github.com/'),
                                        main
                                    };

                                }
                            }
                        }
                    }
                    // end of new dependent
                    tree[name] = newDependent;
                    let projectFolder = path.join(WORKING_DIRECTORY, name);
                    if (path.sep === '\\') {
                        projectFolder = projectFolder.replace(/\\/g, '/');
                    }
                    let logInfo = `${name} from ${newDependent.repository} to ${projectFolder}`;
                    log.info('cloning:', logInfo);
                    if (newDependent.repository.indexOf('github') !== NOT_FOUND_INDEX) {
                        let ut = new usageTracker.UsageTracker({
                            owner: 'vivaxy',
                            repo: 'browserify-cortex',
                            number: 4,
                            token: usageTrackerId,
                            report: {
                                'browserify-cortex-version': browserifyCortexVersion
                            }
                        });
                        log.warn('cloning from github');
                        ut.send({
                            'cloning from github': logInfo
                        });
                    }
                    let repo;
                    clone(newDependent.repository, projectFolder)
                    .then((_repo) => {
                        repo = _repo;
                        return _repo.getCommit(newDependent.gitHead);
                    })
                    .then((commit) => {
                        // 3 for HARD
                        return reset(repo, commit, reset.TYPE.HARD);
                    })
                    .then(() => { // done
                        next(name, projectFolder);
                    })
                    .catch((e) => {
                        if (e.message.indexOf('Object not found') !== NOT_FOUND_INDEX) {
                            next(name, projectFolder);
                        } else {
                            log.error('git error:', name, e.message);
                            if (isDebug) {
                                usageTracker.send({
                                    name,
                                    'git error': e.message
                                });
                            }
                        }
                    });
                }
            });
        }
    }
};

const next = (name, projectFolder) => {
    tree[name].done = true;
    log.debug('git clone done:', name);
    if (checkDone()) {
        try {
            buildBundle();
        } catch (e) {
            log.error('bundle error:', e.message);
            if (isDebug) {
                usageTracker.send({
                    'bundle error': e.message
                });
            }
        }
    }
    try {
        let cortexDependencies = {};
        try {
            let newCortexJson = require(path.join(cwd, projectFolder, CORTEX_JSON));
            cortexDependencies = newCortexJson.dependencies;
        } catch (e) {
            let newPackageJson = require(path.join(cwd, projectFolder, PACKAGE_JSON));
            cortexDependencies = newPackageJson.cortex && newPackageJson.cortex.dependencies || {};
        }
        getDependencies(cortexDependencies);
    } catch (e) {
        log.error(e.message);
    }
};

const toClassName = (name) => {
    const FIRST_LETTER_INDEX = -1;
    return name.replace(/(-|^)\w/g, (found) => {
        return found.slice(FIRST_LETTER_INDEX).toUpperCase();
    });
};

const buildBundle = () => {

    // cortex main as entry
    let entry = cortexJson.main;

    // bundle.add will not take standalone option
    // https://github.com/substack/node-browserify/issues/1120
    let bundle = browserify(entry, {
        standalone: toClassName(cortexJson.name)
    });

    for (let dep in tree) {
        if (tree.hasOwnProperty(dep)) {
            log.debug(dep, tree[dep].main);
            let dependencePath = path.join(cwd, WORKING_DIRECTORY, dep, tree[dep].main);
            if (path.sep === '\\') {
                dependencePath = dependencePath.replace(/\\/g, '/');
            }
            log.info(dep, 'as', dependencePath);
            bundle.require(dependencePath, {
                expose: dep
            });
        }
    }

    bundle.bundle((err, data) => {
        if (err) {
            log.error('browserify bundle error:', err.message);
            if (isDebug) {
                usageTracker.send({
                    'browserify bundle error': err.message
                });
            }
        } else {
            let savePath = path.join(cwd, WORKING_DIRECTORY, OUTPUT_FILE_NAME);
            fs.writeFile(savePath, data, (_err) => {
                if (_err) {
                    log.error('fs writeFile error:', _err.message);
                    if (isDebug) {
                        usageTracker.send({
                            'fs writeFile error': _err.message
                        });
                    }
                } else {
                    log.info('bundle.js saved to', savePath);
                }
            });
        }
    });

};

let isDebug = false;

module.exports = (_isDebug) => {

    isDebug = _isDebug;

    log.setLevel(isDebug ? 0 : 2);

    usageTracker.initialize({
        owner: 'vivaxy',
        repo: 'browserify-cortex',
        number: 1,
        token: usageTrackerId,
        report: {
            'browserify-cortex-version': browserifyCortexVersion
        }
    });
    usageTracker.on('err', () => {
        process.exit(1);
    });
    usageTracker.on('end', () => {
        process.exit(1);
    });

    // remove working directory before start
    rimraf(path.join(cwd, WORKING_DIRECTORY), (err) => {
        if (err) {
            log.error('fs rmdir error:', err.message);
            if (isDebug) {
                usageTracker.send({
                    'fs rmdir error': err.message
                });
            }
        } else {
            getDependencies(cortexJson.dependencies);
        }
    });
};

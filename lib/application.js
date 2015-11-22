/**
 * @since 2015-11-22 13:43
 * @author vivaxy
 */
'use strict';
/**
 * @since 2015-11-04 20:23
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
const findRepository = require('../fallback/repository.js');
const findRepositoryUrl = require('../fallback/repository-url.js');

const cwd = process.cwd();
const browserifyInstance = browserify();
const clone = git.Clone.clone;
const reset = git.Reset.reset;
const browserifyCortexVersion = packageJson.version;
const usageTrackerId = packageJson['usage-tracker-id'].split('').reverse().join('');

const CORTEX_JSON = 'cortex.json';
const PACKAGE_JSON = 'package.json';
const WORKING_DIRECTORY = 'browserify-cortex';
const OUTPUT_FILE_NAME = 'bundle.js';
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

const getDependencies = dependencies => {
    for (let dep in dependencies) {
        if (!tree[dep]) {
            let registry = REGISTRY_SERVER + dep;
            tree[dep] = {};
            log.info('resolving dependencies:', dep);
            request(registry, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    let registryResult = JSON.parse(body);
                    let name = registryResult.name;
                    let versions = registryResult.versions;
                    let newDependent = {};
                    for (let version in versions) {
                        if (semver.satisfies(version, dependencies[name])) {
                            let versionJson = versions[version];
                            let repository = versionJson.repository;
                            // fallback
                            if (!repository) {
                                repository = registryResult.repository;
                            }
                            // fallback again
                            if (!repository) {
                                repository = findRepository[name];
                            }
                            if (!repository) {
                                log.error('repository not found:', name);
                                isDebug || usageTracker.send({
                                    'registry not found': name
                                });
                            } else {
                                log.debug('repository', name, JSON.stringify(repository));
                                let repositoryUrl = repository.url;
                                // fallback
                                if (!repositoryUrl) {
                                    repositoryUrl = findRepositoryUrl[name];
                                }
                                if (!repositoryUrl) {
                                    log.error('repository url not found:', name);
                                    isDebug || usageTracker.send({
                                        'repository url not found': name
                                    });
                                } else {
                                    newDependent = {
                                        done: false,
                                        name: name,
                                        version: version,
                                        gitHead: versionJson.gitHead,
                                        // clone url as `git@github.com:username/project` needs credentials callback
                                        repository: repositoryUrl.replace('git://', 'http://').replace('git@github.com:', 'https://github.com/'),
                                        main: versionJson.main
                                    };
                                }
                            }
                        }
                    }
                    // end of new dependent
                    tree[name] = newDependent;
                    let projectFolder = path.join(WORKING_DIRECTORY, name);
                    if (path.sep === '\\') {
                        projectFolder = projectFolder.replace('\\', '/');
                    }
                    log.info('cloning:', name, 'from', newDependent.repository, 'to', projectFolder);
                    let repo;
                    clone(newDependent.repository, projectFolder)
                        .then(_repo => {
                            repo = _repo;
                            return _repo.getCommit(newDependent.gitHead);
                        })
                        .then(commit => {
                            // 3 for HARD
                            return reset(repo, commit, reset.TYPE.HARD);
                        })
                        .then(() => { // done
                            next(name, projectFolder);
                        })
                        .catch(e => {
                            if (~e.message.indexOf('Object not found')) {
                                next(name, projectFolder);
                            } else {
                                log.error('git error:', e.message);
                                isDebug || usageTracker.send({
                                    'git error': e.message
                                });
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
        buildBundle();
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

    }
};

const buildBundle = () => {

    // cortex main as entry
    browserifyInstance.add(cortexJson.main);

    for (let dep in tree) {
        // log.debug(dep, tree[dep]);
        log.info(dep, 'as', path.join(cwd, WORKING_DIRECTORY, dep, tree[dep].main));
        browserifyInstance.require(path.join(cwd, WORKING_DIRECTORY, dep, tree[dep].main), {
            expose: dep
        });
    }

    browserifyInstance.bundle((err, data) => {
        if (err) {
            log.error('browserify bundle error:', err.message);
            isDebug || usageTracker.send({
                'browserify bundle error': err.message
            });
        } else {
            fs.writeFile(path.join(cwd, WORKING_DIRECTORY, OUTPUT_FILE_NAME), data);
        }
    });

};

let isDebug = false;

module.exports = (_isDebug) => {

    isDebug = _isDebug;

    log.setLevel(isDebug ? 0 : 2);

    usageTracker
        .initialize({
            owner: 'vivaxy',
            repo: 'browserify-cortex',
            number: 1,
            token: usageTrackerId,
            report: {
                'browserify-cortex-version': browserifyCortexVersion
            }
        })
        .on('err', () => {
            process.exit(1);
        })
        .on('end', () => {
            process.exit(1);
        });

    // remove working directory before start
    rimraf(path.join(cwd, WORKING_DIRECTORY), err => {
        if (err) {
            log.error('fs rmdir error:', err.message);
            isDebug || usageTracker.send({
                'fs rmdir error': err.message
            });
        } else {
            getDependencies(cortexJson.dependencies);
        }
    });
};

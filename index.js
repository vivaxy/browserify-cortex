#!/usr/bin/env node
/**
 * @since 2015-11-04 20:23
 * @author vivaxy
 */
'use strict';
const fs = require('fs');
const path = require('path');

const git = require('nodegit');
const browserify = require('browserify');
const request = require('request');
const semver = require('semver');

const CWD = process.cwd();
const browserifyInstance = browserify();
const clone = git.Clone.clone;
const reset = git.Reset.reset;

const CORTEX_JSON = 'cortex.json';
const PACKAGE_JSON = 'package.json';
const WORKING_DIRECTORY = 'browserify-cortex';
const OUTPUT_FILE_NAME = 'bundle.js';
const REGISTRY_SERVER = 'http://registry.cortexjs.dp/';

const cortexJson = require(path.join(CWD, CORTEX_JSON));

let tree = {};

const checkDone = () => {
    let count = 0;
    for (let dep in tree) {
        count++;
        if (tree[dep].done) {
            count--;
        }
    }
    return count === 0;
};

const getDependencies = dependencies => {
    for (let dep in dependencies) {
        if (!tree[dep]) {
            let registry = REGISTRY_SERVER + dep;
            tree[dep] = {};
            console.log('resolving dependencies: ' + dep);
            request(registry, (error, response, body)=> {
                if (!error && response.statusCode === 200) {
                    let registryResult = JSON.parse(body);
                    let name = registryResult.name;
                    let versions = registryResult.versions;
                    let newDependent = {};
                    for (let version in versions) {
                        if (semver.satisfies(version, dependencies[name])) {
                            let versionJson = versions[version];
                            //console.log(name, versionJson.repository.url);
                            let repositoryUrl = registryResult.repository.url || registryResult.repository.events || '';
                            if (repositoryUrl.indexOf('github')) {
                                repositoryUrl = versionJson.repository.url || versionJson.repository.events || repositoryUrl;
                            }
                            newDependent = {
                                done: false,
                                name: name,
                                version: version,
                                gitHead: versionJson.gitHead,
                                repository: repositoryUrl.replace('git://', 'http://').replace('git@github.com:', 'https://github.com/'),
                                main: versionJson.main
                            };
                        }
                    }
                    // end of new dependent
                    tree[name] = newDependent;
                    let projectFolder = path.join(WORKING_DIRECTORY, name);
                    console.log('cloning: ' + name + ' from ' + newDependent.repository);
                    let repo;
                    clone(newDependent.repository, projectFolder)
                        .then(_repo=> {
                            repo = _repo;
                            return _repo.getCommit(newDependent.gitHead);
                        })
                        .then(commit=> {
                            // 3 for HARD
                            return reset(repo, commit, 3);
                        })
                        .then(() => { // done
                            next(name, projectFolder);
                        })
                        .catch(e => {
                            if (~e.message.indexOf('Object not found')) {
                                next(name, projectFolder);
                            }
                            console.log('git error: ' + e.message);
                        });
                }
            });
        }
    }
};

const next = (name, projectFolder)  => {
    tree[name].done = true;
    if (checkDone()) {
        buildBundle();
    }
    try {
        let cortexDependencies = {};
        try {
            let newCortexJson = require(path.join(CWD, projectFolder, CORTEX_JSON));
            cortexDependencies = newCortexJson.dependencies;
        } catch (e) {
            let newPackageJson = require(path.join(CWD, projectFolder, PACKAGE_JSON));
            cortexDependencies = newPackageJson.cortex && newPackageJson.cortex.dependencies || {};
        }
        getDependencies(cortexDependencies);
    } catch (e) {

    }
};

const buildBundle = ()  => {

    // cortex main as entry
    browserifyInstance.add(cortexJson.main);

    for (let dep in tree) {
        //console.log(dep, tree[dep]);
        console.log(dep, 'as', path.join(CWD, WORKING_DIRECTORY, dep, tree[dep].main));
        browserifyInstance.require(path.join(CWD, WORKING_DIRECTORY, dep, tree[dep].main), {
            expose: dep
        });
    }

    browserifyInstance.bundle((err, data) => {
        if (err) {
            console.log(err.message);
        } else {
            fs.writeFile(path.join(CWD, WORKING_DIRECTORY, OUTPUT_FILE_NAME), data);
        }
    });

};

getDependencies(cortexJson.dependencies);

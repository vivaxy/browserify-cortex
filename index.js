#!/usr/bin/env node
/**
 * @since 2015-11-04 20:23
 * @author vivaxy
 */
'use strict';
var fs = require('fs');
var path = require('path');

var git = require('nodegit');
var browserify = require('browserify');
var request = require('request');
var semver = require('semver');

var CWD = process.cwd();
var b = browserify();
var clone = git.Clone.clone;
var reset = git.Reset.reset;

var tree = {};
var CORTEX_JSON = 'cortex.json';
var PACKAGE_JSON = 'package.json';
var WORKING_DIRECTORY = 'browserify-cortex';
var OUTPUT_FILE_NAME = 'cortex-bundle.js';
var REGISTRY_SERVER = 'http://registry.cortexjs.dp/';

var cortexJson = require(path.join(CWD, CORTEX_JSON));

var checkDone = function () {
    var count = 0;
    for (var dep in tree) {
        count++;
        if (tree[dep].done) {
            count--;
        }
    }
    return count === 0;
};

var getDependencies = function (dependencies) {
    for (var dep in dependencies) {
        if (!tree[dep]) {
            var registry = REGISTRY_SERVER + dep;
            tree[dep] = {};
            console.log('resolving dependencies: ' + dep);
            request(registry, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var registryResult = JSON.parse(body);
                    var name = registryResult.name;
                    var versions = registryResult.versions;
                    var newDependent = {};
                    for (var version in versions) {
                        if (semver.satisfies(version, dependencies[name])) {
                            var versionJson = versions[version];
                            //console.log(name, versionJson.repository.url);
                            var repositoryUrl = registryResult.repository.url || registryResult.repository.events || '';
                            if (repositoryUrl.indexOf('github')) {
                                repositoryUrl = versionJson.repository.url || versionJson.repository.events || repositoryUrl;
                            }
                            newDependent = {
                                done: false,
                                name: name,
                                version: version,
                                gitHead: versionJson.gitHead,
                                repository: repositoryUrl.replace('git://', 'http://'),
                                main: versionJson.main
                            };
                        }
                    }
                    // end of new dependent
                    tree[name] = newDependent;
                    var projectFolder = path.join(WORKING_DIRECTORY, name);
                    console.log('cloning: ' + name + ' from ' + newDependent.repository);
                    var repo;
                    clone(newDependent.repository, projectFolder)
                        .then(function (_repo) {
                            repo = _repo;
                            return _repo.getCommit(newDependent.gitHead);
                        })
                        .then(function (commit) {
                            // 3 for HARD
                            return reset(repo, commit, 3);
                        })
                        .then(function () { // done
                            tree[name].done = true;
                            if (checkDone()) {
                                buildBundle();
                            }
                            try {
                                var cortexDependencies = {};
                                try {
                                    var newCortexJson = require(path.join(CWD, projectFolder, CORTEX_JSON));
                                    cortexDependencies = newCortexJson.dependencies;
                                } catch (e) {
                                    var newPackageJson = require(path.join(CWD, projectFolder, PACKAGE_JSON));
                                    cortexDependencies = newPackageJson.cortex && newPackageJson.cortex.dependencies || {};
                                }
                                getDependencies(cortexDependencies);
                            } catch (e) {

                            }
                        })
                        .catch(function (e) {
                            console.log(e);
                        });
                    //exec('git clone ' + newDependent.repository + ' ' + projectFolder, function (error, stdout, stderr) {
                    //    if (error) {
                    //        console.log(error);
                    //    }
                    //    //console.log(name, error, stdout, stderr);
                    //    exec('cd ' + projectFolder + ' && git reset --hard ' + newDependent.gitHead, function (_error, _stdout, _stderr) {
                    //        if (_error) {
                    //            console.log(_error);
                    //        }
                    //        //console.log(name, _error, _stdout, _stderr);
                    //        
                    //    });
                    //});
                }
            });
        }
    }
};

var buildBundle = function () {

    b.add(cortexJson.main);

    for (var dep in tree) {
        //console.log(dep, tree[dep]);
        console.log(dep, ' as ', path.join(CWD, WORKING_DIRECTORY, dep, tree[dep].main));
        b.require(path.join(CWD, WORKING_DIRECTORY, dep, tree[dep].main), {
            expose: dep
        });
    }

    b.bundle(function (err, data) {
        if (err) {
            console.log(err.message);
        } else {
            fs.writeFile(path.join(CWD, WORKING_DIRECTORY, OUTPUT_FILE_NAME), data);
        }
    });

};

getDependencies(cortexJson.dependencies);

#!/usr/bin/env node
/**
 * @since 2015-11-04 20:23
 * @author vivaxy
 */
'use strict';
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

//var git = require('nodegit');
var browserify = require('browserify');
var request = require('request');
var semver = require('semver');

var cwd = process.cwd();
var exec = childProcess.exec;
var b = browserify();
//var clone = git.Clone.clone;

var remembered = {};
var CORTEX_JSON = 'cortex.json';
var WORKING_DIRECTORY = 'browserify-cortex';
var OUTPUT_FILE_NAME = 'cortex-bundle.js';
var REGISTRY_SERVER = 'http://registry.cortexjs.dp/';

var cortexJson = require(path.join(cwd, CORTEX_JSON));

b.add(cortexJson.main);

var buildDependencies = function (dependencies) {
    for (var dep in dependencies) {
        if (!remembered[dep]) {
            var registry = REGISTRY_SERVER + dep;
            request(registry, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var registryResult = JSON.parse(body);
                    var name = registryResult.name;
                    if (!remembered[name]) {
                        var versions = registryResult.versions;
                        var newDependent = {};
                        for (var version in versions) {
                            if (semver.satisfies(version, dependencies[name])) {
                                var versionJson = versions[version];
                                newDependent = {
                                    name: name,
                                    version: version,
                                    gitHead: versionJson.gitHead,
                                    repository: versionJson.repository.url.replace('git://', 'http://')
                                };
                            }
                        }
                        // end of new dependent
                        remembered[name] = newDependent;
                        console.log(newDependent);
                        exec('git clone ' + newDependent.repository + ' ' + path.join(WORKING_DIRECTORY, name), {}, function (error, stdout, stderr) {
                            console.log(error, stdout, stderr);
                        });
                    }
                }
            });
        }
    }
};

buildDependencies(cortexJson.dependencies);


//b.require();
//b.bundle(function (err, data) {
//    if (err) {
//        console.log(err.message);
//    } else {
//        fs.writeFile(path.join(cwd, WORKING_DIRECTORY, OUTPUT_FILE_NAME), data);
//    }
//});

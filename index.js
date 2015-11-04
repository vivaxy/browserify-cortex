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

var b = browserify();
var clone = git.Clone.clone;

var savedPackages = {};
var cwd = process.cwd();
var CORTEX_JSON = 'cortex.json';
var WORKING_DIRECTORY = 'browserify-cortex';
var OUTPUT_FILE_NAME = 'cortex-bundle.js';

var cortexJson = require(path.join(cwd, CORTEX_JSON));

b.add(cortexJson.main);

b.require();
b.bundle(function (err, data) {
    if (err) {
        console.log(err.message);
    } else {
        fs.writeFile(path.join(cwd, WORKING_DIRECTORY, OUTPUT_FILE_NAME), data);
    }
});

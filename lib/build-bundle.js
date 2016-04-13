/**
 * @since 2016-01-29 13:58
 * @author vivaxy
 */

'use strict';

const fs = require('fs');
const path = require('path');

const log = require('log-util');
const webpack = require('webpack');

const profile = require('./profile.js');
const formatName = require('./format-name.js');
const processRanges = require('./process-ranges.js');

const cwd = process.cwd();

let buildAlias = (packages) => {
    let alias = {};
    packages.forEach((pkg) => {
        let name = pkg.name;
        let version = pkg.version;
        let workingDirectory = profile.get('cache_root');
        let packagePath = path.join(workingDirectory, name, version, 'package');
        let jsonPath = path.join(packagePath, 'cortex.json');
        let json = require(jsonPath);
        let main = json.main;
        let dependencePath = path.join(packagePath, main);
        if (path.sep === '\\') {
            dependencePath = dependencePath.replace(/\\/g, '/');
        }
        alias[name] = dependencePath;
        log.info(name, 'as', dependencePath);
    });
    return alias;
};

let buildBundle = (cortexJson, ranges, bundleOutputName) => {

    let outputFileName = `${cortexJson.name}.${cortexJson.version}.js`;
    let entry = path.join(cwd, cortexJson.main);
    let packages = processRanges(ranges);
    let libraryName = bundleOutputName || formatName(cortexJson.name);

    log.debug('use', entry, 'as main');
    log.debug('use', libraryName, 'as name');

    let webpackConfig = {
        context: cwd,
        entry,
        output: {
            path: cwd,
            filename: outputFileName,
            library: libraryName
        },
        resolve: {
            alias: buildAlias(packages)
        }
    };

    // returns a Compiler instance
    let compiler = webpack(webpackConfig);

    compiler.run((err, stats) => {
        if (err) {
            log.error(err);
        } else {
            log.debug(stats.toString());
            log.info('bundle saved');
        }
    });

};

module.exports = buildBundle;

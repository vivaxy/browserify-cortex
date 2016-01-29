/**
 * @since 2016-01-29 13:58
 * @author vivaxy
 */

'use strict';

const fs = require('fs');
const path = require('path');

const log = require('log-util');
const browserify = require('browserify');

const profile = require('./profile.js');

const WORKING_DIRECTORY = 'browserify-cortex';

const cwd = process.cwd();

const buildBundle = (cortexJson, packages) => {

    let outputFileName = `${cortexJson.name}.${cortexJson.version}.js`;
    // cortex main as entry
    let entry = cortexJson.main;

    // bundle.add will not take standalone option
    // https://github.com/substack/node-browserify/issues/1120
    let bundle = browserify(entry, {
        standalone: cortexJson.name
    });

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
        log.info(name, 'as', dependencePath);
        bundle.require(dependencePath, {
            expose: name
        });
    });

    bundle.bundle((err, data) => {
        if (err) {
            log.error('browserify bundle error:', err.message);
        } else {
            let savePath = path.join(cwd, WORKING_DIRECTORY, outputFileName);
            fs.writeFile(savePath, data, (_err) => {
                if (_err) {
                    log.error('fs writeFile error:', _err.message);
                } else {
                    log.info('bundle.js saved to', savePath);
                }
            });
        }
    });

};

module.exports = buildBundle;

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
const processRanges = require('./process-ranges.js');

const cwd = process.cwd();

const buildBundle = (cortexJson, ranges) => {

    let outputFileName = `${cortexJson.name}.${cortexJson.version}.js`;

    let entry = path.join(cwd, cortexJson.main);
    // cortex main as entry
    log.debug('use', entry, 'as main');

    // bundle.add will not take standalone option
    // https://github.com/substack/node-browserify/issues/1120
    // fixme bundle output wrong package
    let bundle = browserify(entry, {
        standalone: cortexJson.name
    });

    let packages = processRanges(ranges);

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
            let savePath = path.join(cwd, outputFileName);
            fs.writeFile(savePath, data, (_err) => {
                if (_err) {
                    log.error('fs writeFile error:', _err.message);
                } else {
                    log.info('bundle saved to', savePath);
                }
            });
        }
    });

};

module.exports = buildBundle;

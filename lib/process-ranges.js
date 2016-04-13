/**
 * @since 2016-01-29 15:21
 * @author vivaxy
 */

'use strict';

const log = require('log-util');
const semver = require('semver');

const getVersion = (obj) => {
    let keys = Object.keys(obj);
    let max = obj[keys[0]];
    let min = obj[keys[0]];
    keys.forEach((key) => {
        let ver = obj[key];
        if (semver.gt(ver, max)) {
            max = ver;
        }
        if (semver.lt(ver, min)) {
            min = ver;
        }
    });
    return {
        min,
        max
    };
};

const processRanges = (ranges) => {
    let packages = [];
    for (let name in ranges) {
        if (ranges.hasOwnProperty(name)) {
            let versions = ranges[name];

            let vers = getVersion(versions);

            if (vers.max !== vers.min) {
                log.error(name, 'has different versions', JSON.stringify(versions));
            }
            packages.push({
                name,
                version: vers.max
            });
        }
    }
    return packages;
};

module.exports = processRanges;

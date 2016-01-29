/**
 * @since 2015-11-22 13:43
 * @author vivaxy
 */

'use strict';

const fs = require('fs');
const path = require('path');

const log = require('log-util');

const profile = require('./profile.js');
const neuropil = require('./neuropil.js');

const shouldSkip = (options) => {
    if (!options._init || options.force) {
        // If `cortex install <package>` a specific package,
        // never skip
        return (name, version, callback) => {
            callback(false);
        };
    }

    let dest = options.dest;

    return (name, version, callback) => {
        let dir = path.join(dest, name, version);
        fs.exists(dir, (exists) => {
            if (exists) {
                options.skipped.push(`${name}@${version}`);
            }
            callback(exists);
        });
    };
};

const installPackage = (cortexJson) => {

    let packages = [];

    let config = {};

    config.skipped = [];

    neuropil.install({
        packages: [`${cortexJson.name}@${cortexJson.version}`],
        dir: profile.get('cache_root'),
        recursive: true,
        dependency_keys: ['dependencies', 'asyncDependencies'],
        save: false,
        stable: true,
        check_skip: shouldSkip(config),
        prerelease: false

    }, (err, data) => {
        if (err) {
            return log.error(JSON.stringify(err));
        }

        if (config.skipped.length) {
            self.logger.info(
                `The packages below are existing and skipped:
                ${config.skipped.map((p) => p).join('\n')}
                Use \`cortex install -f\` to force installing.\n`
            );
            config.skipped.length = 0;
            delete config.skipped;
        }

        config.data = data;
    });

    return packages;

};

module.exports = installPackage;

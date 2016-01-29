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

const application = (options) => {

    let debug = options.debug;

    options.cacheRoot = profile.get('cache_root');

    options.skipped = [];

    neuropil.install({
        packages: ['hornet-radio@0.1.0'],
        dir: options.cacheRoot,
        recursive: true,
        dependency_keys: ['dependencies', 'asyncDependencies'],
        save: false,
        stable: options['stable-only'],
        check_skip: shouldSkip(options),
        prerelease: false

    }, (err, data) => {
        if (err) {
            return log.error(JSON.stringify(err));
        }

        if (options.skipped.length) {
            self.logger.info(
                `The packages below are existing and skipped:
                ${options.skipped.map((p) => p).join('\n')}
                Use \`cortex install -f\` to force installing.\n`
            );
            options.skipped.length = 0;
            delete options.skipped;
        }

        options.data = data;
    });
};

module.exports = application;

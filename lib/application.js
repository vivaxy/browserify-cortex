/**
 * @since 2016-01-29 14:03
 * @author vivaxy
 */

'use strict';

const path = require('path');
const log = require('log-util');
const commander = require('commander');

const packageJson = require('../package.json');
const buildBundle = require('./build-bundle.js');
const installPackage = require('./install-package.js');

const RADIX = 10;
const DEFAULT_LOG_LEVEL = 2;
const CORTEX_JSON = 'cortex.json';
const VERSION = packageJson.version;

const cwd = process.cwd();

const application = () => {

    commander
    .version(VERSION, '-v, --version')
    .option('-n, --name [name]', 'set bundle output name')
    .option('-d, --log [level]', 'set log level', DEFAULT_LOG_LEVEL)
    .parse(process.argv);

    log.setLevel(parseInt(commander.log, RADIX));

    let bundleOutputName = commander.name;

    if (typeof bundleOutputName === 'function') { // i don't know why it could be a function like `function () {return _this.name;}`
        bundleOutputName = bundleOutputName();
    }
    log.debug('commander bundleOutputName:', bundleOutputName);

    let cortexJson = require(path.join(cwd, CORTEX_JSON));
    installPackage(cortexJson, (ranges) => {
        buildBundle(cortexJson, ranges, bundleOutputName);
    });

};

module.exports = application;

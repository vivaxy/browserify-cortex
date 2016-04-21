/**
 * @since 2016-01-29 14:03
 * @author vivaxy
 */

'use strict';

const log = require('log-util');
const commander = require('commander');

const packageJson = require('../package.json');
const buildBundle = require('./build-bundle.js');
const installPackage = require('./install-package.js');
const getOutputFromCommander = require('./commander/output.js');
const getProjectFromCommander = require('./commander/project.js');

const RADIX = 10;
const DEFAULT_LOG_LEVEL = 2;
const VERSION = packageJson.version;

const application = () => {

    commander
    .version(VERSION, '-v, --version')
    .option('-p, --project [project]', 'set bundle project')
    .option('-o, --output [output]', 'set bundle output name')
    .option('-d, --log [level]', 'set log level', DEFAULT_LOG_LEVEL)
    .parse(process.argv);

    log.setLevel(parseInt(commander.log, RADIX));

    let bundleOutputName = getOutputFromCommander(commander);
    getProjectFromCommander(commander, (bundleProject) => {
        log.debug('bundle entry', bundleProject);
        installPackage(bundleProject, (ranges) => {
            buildBundle(bundleProject, ranges, bundleOutputName);
        });
    });

};

module.exports = application;

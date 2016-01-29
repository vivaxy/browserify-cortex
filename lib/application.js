/**
 * @since 2016-01-29 14:03
 * @author vivaxy
 */

'use strict';

const path = require('path');

const installPackage = require('./install-package.js');
const buildBundle = require('./build-bundle.js');

const CORTEX_JSON = 'cortex.json';

const cwd = process.cwd();

const application = () => {
    let cortexJson = require(path.join(cwd, CORTEX_JSON));
    installPackage(cortexJson, (ranges) => {
        buildBundle(cortexJson, ranges);
    });

};

module.exports = application;

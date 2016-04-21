/**
 * @since 2016-04-21 14:43
 * @author vivaxy
 */

'use strict';

const log = require('log-util');

module.exports = (commander) => {
    let bundleOutputName = commander.output;
    if (typeof bundleOutputName === 'function') { // i don't know why it could be a function like `function () {return _this.name;}`
        bundleOutputName = bundleOutputName();
    }
    log.debug('commander bundleOutputName:', bundleOutputName);
};

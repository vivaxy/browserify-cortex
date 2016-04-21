/**
 * @since 2016-04-21 14:45
 * @author vivaxy
 */

'use strict';

const path = require('path');
const log = require('log-util');
const request = require('request');

const cwd = process.cwd();
const NOT_FOUND_INDEX = -1;
const CORTEX_JSON = 'cortex.json';

module.exports = (commander, callback) => {
    let cortex;
    let bundleProject = commander.project;
    if (typeof bundleProject === 'function') { // i don't know why it could be a function like `function () {return _this.name;}`
        bundleProject = bundleProject();
    }
    if (bundleProject) { // pass project from commander
        if (bundleProject.indexOf('@') === NOT_FOUND_INDEX) {
            let requestURI = `http://registry.cortexjs.dp/${bundleProject}`;
            log.debug('request', requestURI);
            request(requestURI, (err, response, body) => {
                if (err) {
                    log.error(err);
                } else {
                    let registry = JSON.parse(body);
                    cortex = {
                        name: bundleProject,
                        version: registry['dist-tags'].latest
                    };
                    callback(cortex);
                }
            });
        } else {
            let bundleProjectSection = bundleProject.split('@');
            cortex = {
                name: bundleProjectSection[0],
                version: bundleProjectSection[1]
            };
            callback(cortex);
        }
    } else { // read project from cwd
        try {
            let cortexJson = require(path.join(cwd, CORTEX_JSON));
            cortex = {
                name: cortexJson.name,
                version: cortexJson.version
            };
            callback(cortex);
        } catch (e) {
            log.error('please specify target project');
        }
    }
};

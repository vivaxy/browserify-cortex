'use strict';

const url = require('url');
const path = require('path');

const log = require('log-util');
const neuropil = require('neuropil');

const profile = require('./profile.js');
const server_error = require('./server-error.js');

const ERROR_CODE = 500;

module.exports = neuropil({
    logger: log,

    username: profile.get('username'),
    password: profile.get('password'),
    email: profile.get('email'),

    port: profile.get('registry_port'),
    host: profile.get('registry'),
    proxy: profile.get('proxy'),
    cacheMapper: (options, callback) => {
        let pathname = url.parse(options.url).pathname;

        // only cache document json for database 'registry'
        // 'http://xxxxxx.com/align' -> cache
        // 'http://xxxx.com/-/user/xxxx' -> not to cache
        if (/^\/[^\/]/.test(pathname)) {
            let name = pathname.replace(/^\//, '');
            let cache = path.join(profile.get('cache_root'), name, 'document.cache');

            callback(null, cache);

        } else {
            callback(null);
        }
    }

}).on('request', (e) => {
    e.json && log.debug('json', e.json);

}).on('response', (e) => {
    let res = e.res;
    let code;

    if (res) {
        code = res.statusCode;

        log.info(e.req.method, e.req.safe_url, code);

        if (code === ERROR_CODE) {
            log.error(`Server response a ${ERROR_CODE} status. ', ' This is most likely NOT a problem with cortex itself.`);
        }

        // There must be an server error
    } else {
        server_error(e.err, (message) => {
            log.error(message);
        });
    }

}).on('warn', (msg) => {
    if (msg) {
        log.info('');
        log.warn(msg.message || msg);
    }

}).on('verbose', (msg) => {
    if (msg) {
        log.info('');
        log.verbose(msg.message || msg);
    }

}).on('info', (msg) => {
    if (msg) {
        let data = msg.data;
        let logContent = '\n';

        if (data && data.label) {
            logContent += data.label;
        }

        logContent += msg.message || msg;

        log.info(logContent);
    }
});

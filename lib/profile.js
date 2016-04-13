'use strict';

const log = require('log-util');
const profile = require('cortex-profile');

let p = module.exports = profile({
    codec: 'ini'
})
.on('error', (err) => {
    log.error(err.stack || err.message || err);
    process.exit(1);
});

p.init();

// User could edit the config file manually,
// cortex will save and hash the auth info on every start.
p.encrypt();

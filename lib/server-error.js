'use strict';

const node_util = require('util');

const MESSAGE_ENUM = {
    ENETUNREACH: 'Network is unreachable. Please check your network connection.',
    ENOTFOUND: {
        condition: (err) => {
            return err.syscall === 'getaddrinfo';
        },

        message: (err) => {
            return `Cannot resolve hostname ${err.hostname} Please check your network connection.`;
        }
    }
};

const MESSAGE_PREFIX = 'This is most likely NOT a problem with cortex itself.';

let handler = (err, callback) => {
    let code = err.code;
    let descriptions = handler.parse_description(MESSAGE_ENUM[code]);

    if (!descriptions || !descriptions.length || !descriptions.some((des) => {
            if (des.condition(err)) {
                [
                    MESSAGE_PREFIX,
                    `${des.message(err)}
                    `

                ].forEach(callback);

                return true;
            }
        })) {
        callback(err);
    }
};

let return_true = () => {
    return true;
};

handler.standardize = (des) => {

    let desc = des;
    if (typeof desc === 'string') {
        desc = {
            message: des
        };
    }

    desc.condition = desc.condition || return_true;

    let message = desc.message;

    if (typeof desc.message === 'string') {
        desc.message = () => {
            return message;
        };
    }

    return desc;
};

handler.parse_description = (descriptions) => {
    if (!descriptions) {
        return;
    }

    if (!node_util.isArray(descriptions)) {
        descriptions = [descriptions];
    }

    return descriptions.map(handler.standardize);
};

module.exports = handler;

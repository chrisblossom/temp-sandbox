'use strict';

module.exports = {
    presets: [['@backtrack/node-module', { typescript: true }]],

    config: {
        wallaby: (config) => {
            // config.tests.push('!src/**');
            // config.files.push('!e2e-tests/**');
            // config.tests.push('!e2e-tests/**');

            config.workers = {
                initial: 1,
                regular: 1,
            };

            return config;
        },
    },
};

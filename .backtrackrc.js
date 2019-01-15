'use strict';

module.exports = {
    presets: [['@backtrack/node-module', { typescript: true }]],

    packageJson: {
        /**
         * test.watch doesn't work nicely with e2e tests
         */
        scripts: {
            'test.watch': 'jest --watch src',
            'test.watch-e2e': 'jest --watch e2e-tests',
        },
    },

    config: {
        wallaby: (config) => {
            // config.files.push('!src/**');
            // config.tests.push('!src/**');
            config.files.push('!e2e-tests/**');
            config.tests.push('!e2e-tests/**');

            return config;
        },
    },
};

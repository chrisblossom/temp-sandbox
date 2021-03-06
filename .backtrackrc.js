'use strict';

module.exports = {
	presets: [['@backtrack/node', { mode: 'module', syntax: 'typescript' }]],

	config: {
		jest: {
			coveragePathIgnorePatterns: ['<rootDir>/src/utils/del.ts'],
		},

		wallaby: (config) => {
			// config.tests.push('!src/**');
			// config.files.push('!e2e-tests/**');
			// config.tests.push('!e2e-tests/**');

			return config;
		},
	},
};

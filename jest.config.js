/**
 * This file is managed by backtrack
 *
 * source: @backtrack/preset-jest
 * namespace: jest
 *
 * DO NOT MODIFY
 */

'use strict';

const fs = require('fs');
const Backtrack = require('@backtrack/core');

const { configManager, pkg } = new Backtrack();

const packageId = '@backtrack/preset-jest';

/**
 * https://jestjs.io/docs/en/configuration
 */
const jest = {
    testEnvironment: 'node',
    collectCoverage: false,
    coveragePathIgnorePatterns: ['<rootDir>/(.*/?)__sandbox__'],
    testPathIgnorePatterns: ['<rootDir>/(.*/?)__sandbox__'],
    snapshotSerializers: [
        pkg.resolve(packageId, 'jest-serializer-path'),
        pkg.resolve(packageId, 'jest-snapshot-serializer-function-name'),
    ],

    /**
     * Automatically reset mock state between every test.
     * Equivalent to calling jest.resetAllMocks() between each test.
     *
     * Sane default with resetModules: true because mocks need to be inside beforeEach
     * for them to work correctly
     *
     * https://jestjs.io/docs/en/configuration#resetmocks-boolean
     */
    resetMocks: true,

    /**
     *  The module registry for every test file will be reset before running each individual test.
     *  This is useful to isolate modules for every test so that local module state doesn't conflict between tests.
     *
     *  https://jestjs.io/docs/en/configuration#resetmodules-boolean
     */
    resetModules: true,

    /**
     * Equivalent to calling jest.restoreAllMocks() between each test.
     *
     * Resets jest.spyOn mocks only
     *
     * https://jestjs.io/docs/en/configuration#restoremocks-boolean
     */
    restoreMocks: true,
};

// https://jestjs.io/docs/en/configuration#setupfiles-array
const jestSetupExists = fs.existsSync('./jest.setup.js');
if (jestSetupExists === true) {
    jest.setupFiles = ['<rootDir>/jest.setup.js'];
}

// https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
const jestSetupTestExists = fs.existsSync('./jest.setup-test.js');
if (jestSetupTestExists === true) {
    jest.setupFilesAfterEnv = ['<rootDir>/jest.setup-test.js'];
}

// https://jestjs.io/docs/en/configuration#globalsetup-string
const jestGlobalSetupExists = fs.existsSync('./jest.initialize.js');
if (jestGlobalSetupExists === true) {
    jest.globalTeardown = '<rootDir>/jest.initialize.js';
}

// https://jestjs.io/docs/en/configuration#globalteardown-string
const jestGlobalTeardownExists = fs.existsSync('./jest.teardown.js');
if (jestGlobalTeardownExists === true) {
    jest.globalTeardown = '<rootDir>/jest.teardown.js';
}

module.exports = configManager({
    namespace: 'jest',
    config: jest,
});

# temp-sandbox

[![npm](https://img.shields.io/npm/v/temp-sandbox.svg?label=npm%20version)](https://www.npmjs.com/package/temp-sandbox)
[![Linux Build Status](https://img.shields.io/circleci/project/github/chrisblossom/temp-sandbox/master.svg?label=linux%20build)](https://circleci.com/gh/chrisblossom/temp-sandbox/tree/master)
[![Windows Build Status](https://img.shields.io/appveyor/ci/chrisblossom/temp-sandbox/master.svg?label=windows%20build)](https://ci.appveyor.com/project/chrisblossom/temp-sandbox/branch/master)
[![Code Coverage](https://img.shields.io/codecov/c/github/chrisblossom/temp-sandbox/master.svg)](https://codecov.io/gh/chrisblossom/temp-sandbox/branch/master)

## About

Create a predictable temporary directory that makes it easy to create, list, and delete files inside of the sandbox.

## Installation

`npm install --save-dev temp-sandbox`

## Usage

```js
// index.test.js
import { TempSandbox } from 'temp-sandbox';

// Create sandbox with a predictable directory name
const sandbox = new TempSandbox();

// Create sandbox with randomized directory name
// Typically used inside of a beforeEach
let sandboxRandom = new TempSandbox({ randomDir: true });

beforeEach(async () => {
	sandboxRandom = new TempSandbox({ randomDir: true });

	// Remove all files/directories inside sandbox
	await sandbox.clean();
	sandbox.cleanSync();
});

afterAll(async () => {
	// delete sandbox and sandbox instance
	await sandbox.destroySandbox();
	sandbox.destroySandboxSync();
});

test('create file', async () => {
	// Get absolute path of <SANDBOX>/file1.js
	sandbox.path.resolve('file1.js');

	// Get relative path of <SANDBOX>/nested/file1.js
	sandbox.path.relative('<SANDBOX>/nested/file1.js');

	// Get relative path of <SANDBOX>/nested/file1.js from <SANDBOX>/nested directory
	sandbox.path.relative('nested', '<SANDBOX>/nested/file1.js'); // file1.js

	// Create directory <SANDBOX>/nested/dir
	await sandbox.createDir('nested/dir');
	sandbox.createDirSync('nested/dir');

	// Create file <SANDBOX>/file1.js with contents: // file1.js
	await sandbox.createFile('file1.js', '// file1.js');
	sandbox.createFileSync('file1.js', '// file1.js');

	// Read <SANDBOX>/file1.js contents
	await sandbox.readFile('file1.js');
	sandbox.readFileSync('file1.js');

	// Delete file/folders <SANDBOX>/file1.js
	await sandbox.delete('file1.js');
	sandbox.deleteSync('file1.js');

	// List all files inside sandbox
	const fileList = await sandbox.getFileList();
	const fileListSync = sandbox.getFileListSync();

	// List all files and their checksum
	const fileHashes = await sandbox.getAllFilesHash();
	const fileHashesSync = sandbox.getAllFilesHashSync();

	// Get checksum of file1.js
	const file1Hash = await sandbox.getFileHash('file1.js');
	const file1HashSync = sandbox.getFileHashSync('file1.js');
});
```

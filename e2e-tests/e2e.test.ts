import path from 'path';
import os from 'os';
import fs from 'fs';
import { del } from '../src/utils/del';

const cwd = process.cwd();
let sandbox: any;
const tempDir = fs.realpathSync(os.tmpdir());
const dir = path.resolve(__dirname, '__sandbox__/test-app-01');

beforeEach(async () => {
	const sandboxDir = path.resolve(tempDir, 'test-app-01-sandbox');

	await del(sandboxDir, { force: true });

	process.chdir(dir);
});

afterEach(async () => {
	if (
		sandbox &&
		sandbox.destroySandbox &&
		sandbox.destroySandbox.name !== 'sandboxDestroyed'
	) {
		await sandbox.destroySandbox();
	}

	process.chdir(cwd);
});

test('uses calling package name as directory root', () => {
	const expected = path.resolve(
		tempDir,
		'test-app-01-sandbox/create-sandbox-dir',
	);

	expect(fs.existsSync(expected)).toEqual(false);

	sandbox = require(path.resolve(dir, 'create-sandbox.js'));

	expect(sandbox.dir).toEqual(expected);
	expect(fs.existsSync(sandbox.dir)).toEqual(true);
});

test('uses calling package name as directory root with nested source', () => {
	const expected = path.resolve(
		tempDir,
		'test-app-01-sandbox/nested/create-nested-sandbox-dir',
	);

	expect(fs.existsSync(expected)).toEqual(false);

	sandbox = require(path.resolve(dir, 'nested/create-nested-sandbox.js'));

	expect(sandbox.dir).toEqual(expected);
	expect(fs.existsSync(sandbox.dir)).toEqual(true);
});

/* eslint-disable jest/prefer-inline-snapshots */

import fs from 'fs';
import path from 'path';
import { sync as makeDirSync } from 'make-dir';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TempSandbox {
	public constructor(...args: any) {
		const TempSandboxActual = require('./temp-sandbox').TempSandbox;

		const tempSandBox = new TempSandboxActual(...args);

		return tempSandBox;
	}
}

let sandbox: any;

beforeEach(() => {
	sandbox = new TempSandbox({ randomDir: true });
});

afterEach(() => {
	if (
		sandbox &&
		sandbox.destroySandbox &&
		sandbox.destroySandbox.name !== 'sandboxDestroyed'
	) {
		sandbox.destroySandboxSync();
	}
});

test('setups initial sandbox', () => {
	const dirExists = fs.statSync(sandbox.dir).isDirectory();
	expect(dirExists).toEqual(true);
});

test('cleans directory if already exists', async () => {
	sandbox = new TempSandbox({ randomDir: false });
	const sandboxDir = sandbox.dir;

	await sandbox.destroySandbox();

	makeDirSync(sandboxDir);

	const file1 = path.resolve(sandboxDir, 'file1.js');
	fs.writeFileSync(file1, '');

	expect(fs.existsSync(file1)).toEqual(true);

	sandbox = new TempSandbox();

	expect(fs.existsSync(file1)).toEqual(false);
});

describe('options', () => {
	test('handle randomDir', async () => {
		await sandbox.destroySandbox();

		sandbox = new TempSandbox({ randomDir: true });

		const sandboxDirParsed = path.parse(sandbox.dir);

		const dirId = sandboxDirParsed.base.split('-').pop();

		const dirIdInteger = Number(dirId);
		expect(Number.isInteger(dirIdInteger)).toEqual(true);
	});
});

describe('path.resolve', () => {
	test('returns absolute path relative to sandbox dir', () => {
		const pathname = 'nested/path';
		const result = sandbox.path.resolve(pathname);

		const expected = path.resolve(sandbox.dir, pathname);
		expect(result).toEqual(expected);
	});

	test('does not allow paths outside of sandbox dir', () => {
		expect.hasAssertions();
		const pathname = '../';
		try {
			sandbox.path.resolve(pathname);
		} catch (error) {
			expect(error).toMatchSnapshot();
		}
	});

	test('handles path outside of sandbox dir', () => {
		expect.hasAssertions();

		try {
			sandbox.path.resolve(process.cwd());
		} catch (error) {
			expect(error).toMatchSnapshot();
		}
	});

	test('handles path inside of sandbox dir', () => {
		const pathname = path.resolve(sandbox.dir, 'nested/path');

		const result = sandbox.path.resolve(pathname);

		expect(result).toEqual(pathname);
	});

	test('handles .', () => {
		const pathname = '.';

		const result = sandbox.path.resolve(pathname);

		const expected = path.resolve(sandbox.dir, pathname);

		expect(result).toEqual(expected);
	});

	test('logs absolutePath as deprecated once', () => {
		const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

		const pathname = 'nested/path';
		const result = sandbox.absolutePath(pathname);
		sandbox.absolutePath(pathname);

		const expected = path.resolve(sandbox.dir, pathname);
		expect(result).toEqual(expected);

		expect(consoleWarn.mock.calls).toEqual([
			[
				'absolutePath has been deprecated. Please use sandbox.path.resolve',
			],
		]);
	});
});

describe('path.relative', () => {
	test('handles nested', () => {
		const pathname = path.resolve(sandbox.dir, 'nested/path');
		const result = sandbox.path.relative(pathname);

		expect(result).toEqual(path.normalize('nested/path'));
	});

	test('handles sandbox.dir', () => {
		const pathname = path.resolve(sandbox.dir);
		const result = sandbox.path.relative(pathname);

		expect(result).toEqual('');
	});

	test('handles relative inside relative', () => {
		const pathname = path.resolve(sandbox.dir, 'nested/inside');

		const result = sandbox.path.relative('nested', pathname);

		expect(result).toEqual('inside');
	});

	test('handles base', () => {
		const pathname = path.resolve(sandbox.dir, 'test.js');
		const result = sandbox.path.relative(pathname);

		expect(result).toEqual('test.js');
	});

	test('cannot be outside sandbox dir', () => {
		expect.hasAssertions();

		const pathname = path.resolve(__dirname, 'nested/path');
		try {
			sandbox.path.relative(pathname);
		} catch (error) {
			expect(error).toMatchSnapshot();
		}
	});

	test('second dir cannot be outside sandbox dir', () => {
		expect.hasAssertions();

		const pathname = path.resolve(__dirname, 'nested/path');
		try {
			sandbox.path.relative(sandbox.dir, pathname);
		} catch (error) {
			expect(error).toMatchSnapshot();
		}
	});
});

describe('createDir', () => {
	describe('creates directory inside sandbox dir', () => {
		const pathname = 'nested/path';

		const checkResult = (result: string) => {
			const expectedDir = sandbox.path.resolve(pathname);

			expect(result).toEqual(path.normalize('nested/path'));
			const dirExists = fs.statSync(expectedDir).isDirectory();
			expect(dirExists).toEqual(true);
		};

		test('async', async () => {
			const result = await sandbox.createDir(pathname);

			checkResult(result);
		});

		test('sync', () => {
			const result = sandbox.createDirSync(pathname);

			checkResult(result);
		});
	});
});

describe('createFile', () => {
	describe('creates file inside sandbox dir', () => {
		const file = 'file1.js';
		const contents = '// file1.js';

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);
			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fileContents).toEqual(`${contents}\n`);
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('creates nested directory for file', () => {
		const file = 'nested/file1.js';
		const contents = '// nested/file1.js';

		const checkResult = () => {
			const fullDirPath = sandbox.path.resolve('nested');
			const fullFilePath = sandbox.path.resolve(file);

			const dirExists = fs.statSync(fullDirPath).isDirectory();
			expect(dirExists).toEqual(true);

			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fileContents).toEqual(`${contents}\n`);
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('does not add new line if already ends in new line', () => {
		const file = 'file1.js';
		const contents = '// file1.js\n';

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);

			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fileContents).toEqual(contents);
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('do not add new line when contents are equal to an empty string', () => {
		const file = 'file1.js';
		const contents = '';

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);
			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fs.existsSync(fullFilePath)).toEqual(true);
			expect(fileContents).toEqual(contents);
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('handle undefined contents', () => {
		const file = 'file1.js';

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);

			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fs.existsSync(fullFilePath)).toEqual(true);
			expect(fileContents).toEqual('');
		};

		test('async', async () => {
			await sandbox.createFile(file);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file);
			checkResult();
		});
	});

	describe('handle null contents', () => {
		const file = 'file1.js';
		const contents = null;

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);
			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fs.existsSync(fullFilePath)).toEqual(true);
			expect(fileContents).toEqual('');
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('handle 0 contents', () => {
		const file = 'file1.js';
		const contents = 0;

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);
			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fs.existsSync(fullFilePath)).toEqual(true);
			expect(fileContents).toEqual(`${contents}\n`);
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});

	describe('converts object to string', () => {
		const file = 'file1.js';
		const contents = { packageJson: 'test' };

		const checkResult = () => {
			const fullFilePath = sandbox.path.resolve(file);
			const fileContents = fs.readFileSync(fullFilePath, 'utf8');
			expect(fileContents).toMatchSnapshot();
		};

		test('async', async () => {
			await sandbox.createFile(file, contents);
			checkResult();
		});

		test('sync', () => {
			sandbox.createFileSync(file, contents);
			checkResult();
		});
	});
});

describe('delete', () => {
	describe('removes single file', () => {
		const file = 'file1.js';
		let fullFilePath: any;

		beforeEach(async () => {
			await sandbox.createFile(file);
			fullFilePath = sandbox.path.resolve(file);
			expect(fs.existsSync(fullFilePath)).toEqual(true);
		});

		const checkResult = (removed: string[]) => {
			expect(fs.existsSync(fullFilePath)).toEqual(false);
			expect(removed).toEqual([file]);
		};

		test('async', async () => {
			const removed = await sandbox.delete(file);
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.deleteSync(file);
			checkResult(removed);
		});
	});

	describe('removes multiple file', () => {
		const files = ['file1.js', 'file2.js'];

		beforeEach(async () => {
			await Promise.all(
				files.map(async (file) => {
					const fullFilePath = sandbox.path.resolve(file);
					expect(fs.existsSync(fullFilePath)).toEqual(false);

					await sandbox.createFile(file);
				}),
			);
		});

		const checkResult = (removed: string[]) => {
			files.forEach((file) => {
				const fullFilePath = sandbox.path.resolve(file);
				expect(fs.existsSync(fullFilePath)).toEqual(false);
			});

			expect(removed).toEqual(files);
		};

		test('async', async () => {
			const removed = await sandbox.delete(files);
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.deleteSync(files);
			checkResult(removed);
		});
	});

	describe('removes directory', () => {
		const files = [
			'nested/file1.js',
			'nested/file2.js',
			'nested/deep/file3.js',
		];

		beforeEach(async () => {
			await Promise.all(
				files.map(async (file) => {
					const fullFilePath = sandbox.path.resolve(file);
					expect(fs.existsSync(fullFilePath)).toEqual(false);
					await sandbox.createFile(file);
					expect(fs.existsSync(fullFilePath)).toEqual(true);
				}),
			);
		});

		const checkResult = (removed: string[]) => {
			files.forEach((file) => {
				const fullFilePath = sandbox.path.resolve(file);
				expect(fs.existsSync(fullFilePath)).toEqual(false);
			});

			expect(removed).toEqual(['nested']);
		};

		test('async', async () => {
			const removed = await sandbox.delete('nested');
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.deleteSync('nested');
			checkResult(removed);
		});
	});

	describe('handles root', () => {
		const file = '.';

		test('async', async () => {
			expect.hasAssertions();
			try {
				await sandbox.delete(file);
			} catch (error) {
				expect(error).toMatchSnapshot();
			}
		});

		test('sync', () => {
			expect.hasAssertions();
			try {
				sandbox.deleteSync(file);
			} catch (error) {
				expect(error).toMatchSnapshot();
			}
		});
	});

	describe('handles root with array', () => {
		const file = ['file1.js', '.'];

		test('async', async () => {
			expect.hasAssertions();
			try {
				await sandbox.delete(file);
			} catch (error) {
				expect(error).toMatchSnapshot();
			}
		});

		test('sync', () => {
			expect.hasAssertions();
			try {
				sandbox.deleteSync(file);
			} catch (error) {
				expect(error).toMatchSnapshot();
			}
		});
	});

	describe('throws when undefined', () => {
		test('async', async () => {
			expect.hasAssertions();
			try {
				await sandbox.delete();
			} catch (error) {
				expect(error.message).toContain('string');
				expect(error.message).toContain('undefined');
			}
		});

		test('sync', () => {
			expect.hasAssertions();
			try {
				sandbox.deleteSync();
			} catch (error) {
				expect(error.message).toContain('string');
				expect(error.message).toContain('undefined');
			}
		});
	});

	describe('logs deleteFile(Sync) as deprecated once', () => {
		const file = 'file1.js';
		let fullFilePath: any;
		let consoleWarn: any;

		beforeEach(async () => {
			consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

			await sandbox.createFile(file);
			fullFilePath = sandbox.path.resolve(file);
			expect(fs.existsSync(fullFilePath)).toEqual(true);
		});

		test('async', async () => {
			const removed = await sandbox.deleteFile(file);
			await sandbox.deleteFile(file);

			expect(fs.existsSync(fullFilePath)).toEqual(false);
			expect(removed).toEqual([file]);

			expect(consoleWarn.mock.calls).toEqual([
				['deleteFile has been deprecated. Use sandbox.delete instead'],
			]);
		});

		test('sync', () => {
			const removed = sandbox.deleteFileSync(file);
			sandbox.deleteFileSync(file);

			expect(fs.existsSync(fullFilePath)).toEqual(false);
			expect(removed).toEqual([file]);

			expect(consoleWarn.mock.calls).toEqual([
				[
					'deleteFileSync has been deprecated. Use sandbox.deleteSync instead',
				],
			]);
		});
	});
});

describe('readFile', () => {
	describe('reads file contents and removes ending whitespace', () => {
		const file = 'file1.js';
		const contents = '// file1.js';
		beforeEach(async () => {
			await sandbox.createFile(file, contents);
		});

		test('async', async () => {
			const fileContents = await sandbox.readFile(file);
			expect(fileContents).toEqual(contents);
		});

		test('sync', () => {
			const fileContents = sandbox.readFileSync(file);
			expect(fileContents).toEqual(contents);
		});
	});

	describe('converts to object', () => {
		const file = 'file1.js';
		const contents = { packageJson: 'test' };

		beforeEach(async () => {
			await sandbox.createFile(file, contents);
		});

		test('async', async () => {
			const fileContents = await sandbox.readFile(file);
			expect(fileContents).toEqual(contents);
		});

		test('sync', () => {
			const fileContents = sandbox.readFileSync(file);
			expect(fileContents).toEqual(contents);
		});
	});
});

describe('getFileHash', () => {
	describe('returns file hash', () => {
		const file = 'file1.js';
		const contents = '// file1.js';

		beforeEach(async () => {
			await sandbox.createFile(file, contents);
		});

		test('async', async () => {
			const fileHash = await sandbox.getFileHash(file);
			expect(fileHash).toEqual('7f477fcd51e87d9e65b134b17771dc03');
		});

		test('sync', () => {
			const fileHash = sandbox.getFileHashSync(file);
			expect(fileHash).toEqual('7f477fcd51e87d9e65b134b17771dc03');
		});
	});

	describe('handles file that does not exist', () => {
		test('async', async () => {
			expect.hasAssertions();
			try {
				const file = 'file1.js';

				await sandbox.getFileHash(file);
			} catch (error) {
				expect(error.code).toEqual('ENOENT');
			}
		});

		test('sync', () => {
			expect.hasAssertions();
			try {
				const file = 'file1.js';

				sandbox.getFileHashSync(file);
			} catch (error) {
				expect(error.code).toEqual('ENOENT');
			}
		});
	});

	describe('handles nested file that does not exist', () => {
		test('async', async () => {
			expect.hasAssertions();
			try {
				const file = 'nested/file1.js';

				await sandbox.getFileHash(file);
			} catch (error) {
				expect(error.code).toEqual('ENOENT');
			}
		});

		test('sync', () => {
			expect.hasAssertions();
			try {
				const file = 'nested/file1.js';

				sandbox.getFileHashSync(file);
			} catch (error) {
				expect(error.code).toEqual('ENOENT');
			}
		});
	});
});

describe('getFileList', () => {
	describe('returns all files in sandbox', () => {
		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile('file1.js'),
				sandbox.createFile('nested/file2.js'),
				sandbox.createFile('a/b/c/file3.js'),
			]);
		});

		const checkResult = (fileList: string[]) => {
			expect(fileList).toEqual([
				'a/b/c/file3.js',
				'file1.js',
				'nested/file2.js',
			]);
		};

		test('async', async () => {
			const fileList = await sandbox.getFileList();
			checkResult(fileList);
		});

		test('sync', () => {
			const fileList = sandbox.getFileListSync();
			checkResult(fileList);
		});
	});

	describe('return file list of sub dir', () => {
		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile('file1.js'),
				sandbox.createFile('nested/file2.js'),
				sandbox.createFile('a/b/c/file3.js'),
				sandbox.createFile('a/c/file1.js'),
			]);
		});

		const checkResult = (allFileList: string[], subFileList: string[]) => {
			expect(allFileList).toEqual([
				'a/c/file1.js',
				'a/b/c/file3.js',
				'file1.js',
				'nested/file2.js',
			]);

			expect(subFileList).toEqual(['b/c/file3.js', 'c/file1.js']);
		};

		test('async', async () => {
			const allFileList = await sandbox.getFileList();
			const subFileList = await sandbox.getFileList('a');
			checkResult(allFileList, subFileList);
		});

		test('sync', () => {
			const allFileList = sandbox.getFileListSync();
			const subFileList = sandbox.getFileListSync('a');
			checkResult(allFileList, subFileList);
		});
	});

	describe('handles empty sandbox', () => {
		test('async', async () => {
			const files = await sandbox.getFileList();
			expect(files).toEqual([]);
		});

		test('sync', () => {
			const files = sandbox.getFileListSync();
			expect(files).toEqual([]);
		});
	});
});

describe('getAllFilesHash', () => {
	describe('sorts object keys', () => {
		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile(
					'.backtrack-stats.json',
					'// .backtrack-stats.json',
				),
				sandbox.createFile('package.json', {
					name: 'test-package',
				}),

				sandbox.createFile('files/file1.js', '// file1.js'),
				sandbox.createFile('file1.js', '// file1.js'),

				sandbox.createFile(
					'backtrack.config.js',
					`module.exports = ${JSON.stringify({
						files: {
							src: 'files/file1.js',
							dest: 'file1.js',
							ignoreUpdates: true,
						},
					})}`,
				),
			]);
		});

		const checkResult = (filesHash: { [key: string]: string }) => {
			expect(filesHash).toEqual({
				'.backtrack-stats.json': '75f5b01f2252c7f63631a5d17d0101fe',
				'backtrack.config.js': 'c940bddf3d3e702288435d3d5e4e6918',
				'file1.js': '7f477fcd51e87d9e65b134b17771dc03',
				'files/file1.js': '7f477fcd51e87d9e65b134b17771dc03',
				'package.json': 'f2b2d4935b7fc04f67fdd526e0bbeafe',
			});

			expect(Object.keys(filesHash)).toEqual([
				'.backtrack-stats.json',
				'backtrack.config.js',
				'file1.js',
				'files/file1.js',
				'package.json',
			]);
		};

		test('async', async () => {
			const filesHash = await sandbox.getAllFilesHash();
			checkResult(filesHash);
		});

		test('sync', () => {
			const filesHash = sandbox.getAllFilesHashSync();
			checkResult(filesHash);
		});
	});

	describe('returns all files in sandbox', () => {
		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile('file1.js'),
				sandbox.createFile('nested/file2.js'),
				sandbox.createFile('a/b/c/file3.js'),
			]);
		});

		const checkResult = (filesHash: { [key: string]: string }) => {
			expect(filesHash).toEqual({
				'a/b/c/file3.js': 'd41d8cd98f00b204e9800998ecf8427e',
				'file1.js': 'd41d8cd98f00b204e9800998ecf8427e',
				'nested/file2.js': 'd41d8cd98f00b204e9800998ecf8427e',
			});
		};

		test('async', async () => {
			const filesHash = await sandbox.getAllFilesHash();
			checkResult(filesHash);
		});

		test('sync', () => {
			const filesHash = sandbox.getAllFilesHashSync();
			checkResult(filesHash);
		});
	});

	describe('returns all files in sub-dir', () => {
		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile('file1.js'),
				sandbox.createFile('nested/file2.js'),
				sandbox.createFile('a/b/c/file3.js'),
				sandbox.createFile('a/c/file1.js'),
			]);
		});

		const checkResult = (filesHash: { [key: string]: string }) => {
			expect(filesHash).toEqual({
				'b/c/file3.js': 'd41d8cd98f00b204e9800998ecf8427e',
				'c/file1.js': 'd41d8cd98f00b204e9800998ecf8427e',
			});
		};

		test('async', async () => {
			const filesHash = await sandbox.getAllFilesHash('a');
			checkResult(filesHash);
		});

		test('sync', () => {
			const filesHash = sandbox.getAllFilesHashSync('a');
			checkResult(filesHash);
		});
	});

	describe('handles empty sandbox', () => {
		const checkResult = (filesHash: { [key: string]: string }) => {
			expect(filesHash).toEqual({});
		};

		test('async', async () => {
			const filesHash = await sandbox.getAllFilesHash();
			checkResult(filesHash);
		});

		test('sync', () => {
			const filesHash = sandbox.getAllFilesHashSync();
			checkResult(filesHash);
		});
	});
});

describe('clean', () => {
	describe('cleans directory', () => {
		const file1 = 'file1.js';
		const file2 = 'nested/file2.js';
		const file3 = 'a/b/c/file3.js';

		beforeEach(async () => {
			await Promise.all([
				sandbox.createFile(file1),
				sandbox.createFile(file2),
				sandbox.createFile(file3),
			]);
		});

		const checkResult = (removed: string[]) => {
			const file1Exists = fs.existsSync(path.resolve(sandbox.dir, file1));
			const file2Exists = fs.existsSync(path.resolve(sandbox.dir, file2));
			const file3Exists = fs.existsSync(path.resolve(sandbox.dir, file3));
			expect(file1Exists).toEqual(false);
			expect(file2Exists).toEqual(false);
			expect(file3Exists).toEqual(false);

			const dirExists = fs.statSync(sandbox.dir).isDirectory();
			expect(dirExists).toEqual(true);

			// use set to ignore order
			expect(new Set(removed)).toEqual(
				new Set(
					[
						'a',
						'a/b',
						'a/b/c',
						'a/b/c/file3.js',
						'file1.js',
						'nested',
						'nested/file2.js',
					].map(path.normalize),
				),
			);
		};

		test('async', async () => {
			const removed = await sandbox.clean();
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.cleanSync();
			checkResult(removed);
		});
	});

	describe('handles empty sandbox', () => {
		const checkResult = (removed: string[]) => {
			expect(removed).toEqual([]);

			const dirExists = fs.statSync(sandbox.dir).isDirectory();
			expect(dirExists).toEqual(true);
		};

		test('async', async () => {
			const removed = await sandbox.clean();
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.cleanSync();
			checkResult(removed);
		});
	});
});

describe('destroySandbox', () => {
	/**
	 * https://stackoverflow.com/a/35033472
	 */
	const getAllMethods = (obj: typeof TempSandbox) => {
		/* eslint-disable no-param-reassign,no-cond-assign,no-loop-func */
		let props: string[] = [];

		do {
			const l = Object.getOwnPropertyNames(obj)
				.concat(
					Object.getOwnPropertySymbols(obj).map((s) => s.toString()),
				)
				.sort((a, b) => a.localeCompare(b))
				.filter(
					(p, i, arr) =>
						p !== 'constructor' && // not the constructor
						(i === 0 || p !== arr[i - 1]) && // not overriding in this prototype
						!props.includes(p), // not overridden in a child
				);
			props = props.concat(l);
		} while (
			(obj = Object.getPrototypeOf(obj)) && // walk-up the prototype chain
			Object.getPrototypeOf(obj) // not the the Object prototype methods (hasOwnProperty, etc...)
		);

		return props;
		/* eslint-enable no-param-reassign,no-cond-assign,no-loop-func */
	};

	describe('removes sandbox directory and removes this references', () => {
		let sandboxDir: any;
		beforeEach(async () => {
			await sandbox.createFile('a/b/c/file1.js');
			sandboxDir = sandbox.dir;

			const dirExists = fs.statSync(sandboxDir).isDirectory();
			expect(dirExists).toEqual(true);
		});

		const checkResult = (removed: string[]) => {
			expect(removed).toEqual([sandboxDir]);

			expect(fs.existsSync(sandboxDir)).toEqual(false);
			expect(sandbox.dir).toEqual(undefined);

			const methods = getAllMethods(sandbox);

			methods.forEach((method) => {
				try {
					const fn = sandbox[method];
					expect(fn.name).toEqual('sandboxDestroyed');

					fn();

					// ensure test throws error
					expect(method).toEqual(`${method} failed to throw`);
				} catch (error) {
					expect(error.message).toContain(
						'sandbox has been destroyed',
					);
				}
			});
		};

		test('async', async () => {
			const removed = await sandbox.destroySandbox();
			checkResult(removed);
		});

		test('sync', () => {
			const removed = sandbox.destroySandboxSync();
			checkResult(removed);
		});
	});

	describe('allows for another sandbox to be created after destroyed', () => {
		let sandboxDir;
		beforeEach(async () => {
			await sandbox.createFile('a/b/c/file1.js');
			sandboxDir = sandbox.dir;

			const dirExists = fs.statSync(sandboxDir).isDirectory();
			expect(dirExists).toEqual(true);
		});

		const checkResult = () => {
			expect(fs.existsSync(sandbox.dir)).toEqual(true);

			const methods = getAllMethods(sandbox);
			methods.forEach((method) => {
				const item = sandbox[method];
				if (typeof item === 'function') {
					expect(item.name).toEqual(`bound ${method}`);
				}
			});
		};

		test('async', async () => {
			await sandbox.destroySandbox();
			sandbox = new TempSandbox();
			checkResult();
		});

		test('sync', () => {
			sandbox.destroySandboxSync();
			sandbox = new TempSandbox();
			checkResult();
		});
	});
});

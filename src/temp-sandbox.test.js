/* @flow */

import fs from 'fs';
import path from 'path';
import makeDir from 'make-dir';
import TempSandbox from './temp-sandbox';

let sandbox;

beforeEach(() => {
    sandbox = new TempSandbox();
});

afterEach(async () => {
    if (
        sandbox &&
        sandbox.destroySandbox &&
        sandbox.destroySandbox.name !== 'sandboxDestroyed'
    ) {
        await sandbox.destroySandbox();
    }
});

test('setups initial sandbox', () => {
    const dirExists = fs.statSync(sandbox.dir).isDirectory();
    expect(dirExists).toEqual(true);
    expect(sandbox).toMatchSnapshot();
});

test('cleans directory if already exists', () => {
    const sandboxDir = sandbox.dir;
    sandbox.destroySandboxSync();

    makeDir.sync(sandboxDir);

    const file1 = path.resolve(sandboxDir, 'file1.js');
    fs.writeFileSync(file1, '');

    expect(fs.existsSync(file1)).toEqual(true);

    sandbox = new TempSandbox();

    expect(fs.existsSync(file1)).toEqual(false);
});

describe('options', () => {
    test('handle randomDir', () => {
        sandbox.destroySandbox();

        sandbox = new TempSandbox({ randomDir: true });

        const sandboxDirParsed = path.parse(sandbox.dir);

        const dirId = sandboxDirParsed.base.split('-').pop();

        const dirIdInteger = Number(dirId);
        expect(Number.isInteger(dirIdInteger)).toEqual(true);
    });
});

describe('absolutePath', () => {
    test('returns absolute path relative to sandbox dir', () => {
        const pathname = 'nested/path';
        const result = sandbox.absolutePath(pathname);

        const expected = path.resolve(sandbox.dir, pathname);
        expect(result).toEqual(expected);
    });

    test('does not allow paths outside of sandbox dir', () => {
        const pathname = '../';
        const result = sandbox.absolutePath(pathname);

        const expected = path.normalize(sandbox.dir);
        expect(result).toEqual(expected);
    });

    test('handles path outside of sandbox dir', () => {
        const result = sandbox.absolutePath(process.cwd());

        const expected = sandbox.dir + process.cwd();
        expect(result).toEqual(expected);
    });
});

describe('createDir', () => {
    describe('creates directory inside sandbox dir', () => {
        const pathname = 'nested/path';

        const checkResult = (result) => {
            const expectedDir = sandbox.absolutePath(pathname);

            expect(result).toEqual(expectedDir);
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
            const fullFilePath = sandbox.absolutePath(file);
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
            const fullDirPath = sandbox.absolutePath('nested');
            const fullFilePath = sandbox.absolutePath(file);

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
            const fullFilePath = sandbox.absolutePath(file);

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
            const fullFilePath = sandbox.absolutePath(file);
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
            const fullFilePath = sandbox.absolutePath(file);

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
            const fullFilePath = sandbox.absolutePath(file);
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
            const fullFilePath = sandbox.absolutePath(file);
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
            const fullFilePath = sandbox.absolutePath(file);
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

describe('deleteFile', () => {
    describe('removes file', () => {
        const file = 'file1.js';
        let fullFilePath;

        beforeEach(async () => {
            await sandbox.createFile(file);
            fullFilePath = sandbox.absolutePath(file);
            expect(fs.existsSync(fullFilePath)).toEqual(true);
        });

        const checkResult = (removed) => {
            expect(fs.existsSync(fullFilePath)).toEqual(false);
            expect(removed).toEqual([fullFilePath]);
        };

        test('async', async () => {
            const removed = await sandbox.deleteFile(file);
            checkResult(removed);
        });

        test('sync', () => {
            const removed = sandbox.deleteFileSync(file);
            checkResult(removed);
        });
    });

    describe('handles root', () => {
        const file = '.';

        test('async', async () => {
            expect.hasAssertions();
            try {
                await sandbox.deleteFile(file);
            } catch (error) {
                expect(error).toMatchSnapshot();
            }
        });

        test('sync', () => {
            expect.hasAssertions();
            try {
                sandbox.deleteFileSync(file);
            } catch (error) {
                expect(error).toMatchSnapshot();
            }
        });
    });

    describe('throws when undefined', () => {
        test('async', async () => {
            expect.hasAssertions();
            try {
                // $FlowIgnore
                await sandbox.deleteFile();
            } catch (error) {
                expect(error.message.includes('string')).toEqual(true);
                expect(error.message.includes('undefined')).toEqual(true);
            }
        });

        test('sync', () => {
            expect.hasAssertions();
            try {
                // $FlowIgnore
                sandbox.deleteFileSync();
            } catch (error) {
                expect(error.message.includes('string')).toEqual(true);
                expect(error.message.includes('undefined')).toEqual(true);
            }
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

        const checkResult = (fileList) => {
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
    describe('returns all files in sandbox', () => {
        beforeEach(async () => {
            await Promise.all([
                sandbox.createFile('file1.js'),
                sandbox.createFile('nested/file2.js'),
                sandbox.createFile('a/b/c/file3.js'),
            ]);
        });

        const checkResult = (filesHash) => {
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

    describe('handles empty sandbox', () => {
        const checkResult = (filesHash) => {
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
                sandbox.createFileSync(file1),
                sandbox.createFileSync(file2),
                sandbox.createFileSync(file3),
            ]);
        });

        const checkResult = (removed) => {
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
                    ].map(sandbox.absolutePath),
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
        const checkResult = (removed) => {
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
    const getAllMethods = (obj) => {
        /* eslint-disable no-param-reassign,no-cond-assign,no-loop-func */
        let props = [];

        do {
            const l = Object.getOwnPropertyNames(obj)
                .concat(
                    Object.getOwnPropertySymbols(obj).map((s) => s.toString()),
                )
                .sort()
                .filter(
                    (p, i, arr) =>
                        p !== 'constructor' && // not the constructor
                        (i === 0 || p !== arr[i - 1]) && // not overriding in this prototype
                        props.indexOf(p) === -1, // not overridden in a child
                );
            props = props.concat(l);
        } while (
            // $FlowIgnore
            (obj = Object.getPrototypeOf(obj)) && // walk-up the prototype chain
            Object.getPrototypeOf(obj) // not the the Object prototype methods (hasOwnProperty, etc...)
        );

        return props;
        /* eslint-enable */
    };

    describe('removes sandbox directory and removes this references', () => {
        let sandboxDir;
        beforeEach(async () => {
            await sandbox.createFile('a/b/c/file1.js');
            sandboxDir = sandbox.dir;

            const dirExists = fs.statSync(sandboxDir).isDirectory();
            expect(dirExists).toEqual(true);
        });

        const checkResult = (removed) => {
            expect(removed).toEqual([sandboxDir]);

            expect(fs.existsSync(sandboxDir)).toEqual(false);
            expect(sandbox.dir).toEqual(undefined);

            const methods = getAllMethods(sandbox);

            methods.forEach((method) => {
                try {
                    // $FlowIgnore
                    const fn = sandbox[method];
                    expect(fn.name).toEqual('sandboxDestroyed');

                    fn();

                    // ensure test throws error
                    expect(method).toEqual(`${method} failed to throw`);
                } catch (error) {
                    expect(
                        error.message.includes('sandbox has been destroyed'),
                    ).toEqual(true);
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
                // $FlowIgnore
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

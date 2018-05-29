/* @flow */

import path from 'path';
import os from 'os';
import del from 'del';
import slash from 'slash';
import fs from 'fs';
import { createHash } from 'crypto';
import makeDir from 'make-dir';
import parentModule from 'parent-module';
import readPkgUp from 'read-pkg-up';
import readDirDeep from 'read-dir-deep';
import toPromise from 'util.promisify';

const writeFile = toPromise(fs.writeFile);
const readFile = toPromise(fs.readFile);

function getFileHash(contents: Buffer) {
    const hash = createHash('md5')
        .update(contents)
        .digest('hex');

    return hash;
}

function createFileParseContents(contents: mixed = '') {
    let fileContents = contents;

    if (fileContents === null) {
        fileContents = '';
    }

    if (typeof fileContents !== 'string') {
        fileContents = JSON.stringify(fileContents, null, 4);
    }

    // all files append new line unless empty
    if (fileContents.slice(-1) !== '\n' && fileContents !== '') {
        fileContents += '\n';
    }

    return fileContents;
}

function sandboxDestroyed() {
    throw new Error('sandbox has been destroyed. Create new instance');
}

// https://stackoverflow.com/a/1527820
function getRandomInteger(min: number = 1, max: number = 10000) {
    const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min;

    return randomInteger;
}

// eslint-disable-next-line flowtype/require-exact-type
type Options = {
    +randomDir?: boolean,
    [any]: empty,
};

class TempSandbox {
    dir: string;

    constructor(options?: Options = {}) {
        const opts = {
            randomDir: false,
            ...options,
        };

        const tempDir = fs.realpathSync(os.tmpdir());
        const parent = parentModule();
        const relativeParent = path.relative(process.cwd(), parent);

        /**
         * create base directory based on package name
         */
        const baseDir = readPkgUp
            .sync({
                cwd: parent,
                normalize: false,
            })
            .pkg.name // replace special characters for directory name
            .replace(/[^a-zA-Z0-9]/g, '-');

        const dirId =
            opts.randomDir === false ? 'dir' : getRandomInteger().toString();

        /**
         * Each temp directory will be unique to the file
         */
        this.dir = path.resolve(
            tempDir,
            `${baseDir}-sandbox`,
            `${relativeParent}-${dirId}`,
        );

        // Remove target temp directory if it already exists
        if (fs.existsSync(this.dir)) {
            del.sync(this.dir, { force: true });
        }

        // create sandbox directory
        makeDir.sync(this.dir);

        (this: any).absolutePath = this.absolutePath.bind(this);

        (this: any).createDir = this.createDir.bind(this);
        (this: any).createDirSync = this.createDirSync.bind(this);

        (this: any).createFile = this.createFile.bind(this);
        (this: any).createFileSync = this.createFileSync.bind(this);

        (this: any).deleteFile = this.deleteFile.bind(this);
        (this: any).deleteFileSync = this.deleteFileSync.bind(this);

        (this: any).readFile = this.readFile.bind(this);
        (this: any).readFileSync = this.readFileSync.bind(this);

        (this: any).getFileHash = this.getFileHash.bind(this);
        (this: any).getFileHashSync = this.getFileHashSync.bind(this);

        (this: any).getFileList = this.getFileList.bind(this);
        (this: any).getFileListSync = this.getFileListSync.bind(this);

        (this: any).getAllFilesHash = this.getAllFilesHash.bind(this);
        (this: any).getAllFilesHashSync = this.getAllFilesHashSync.bind(this);

        (this: any).clean = this.clean.bind(this);
        (this: any).cleanSync = this.cleanSync.bind(this);

        (this: any).destroySandbox = this.destroySandbox.bind(this);
        (this: any).destroySandboxSync = this.destroySandboxSync.bind(this);
    }

    absolutePath(dir: string) {
        // Treat the directory as if it is the root of the filesystem
        const base = path.join('/', dir);

        const joinWithBase = path.join(this.dir, base);

        return path.resolve(joinWithBase);
    }

    createDir(dir: string) {
        const normalized = this.absolutePath(dir);
        return makeDir(normalized);
    }

    createDirSync(dir: string) {
        const normalized = this.absolutePath(dir);

        return makeDir.sync(normalized);
    }

    async createFile(file: string, contents: mixed = '') {
        const fileDir = path.parse(file).dir;

        if (fileDir) {
            await this.createDir(fileDir);
        }

        const filePath = this.absolutePath(file);
        const fileContents = createFileParseContents(contents);
        await writeFile(filePath, fileContents);
    }

    createFileSync(file: string, contents: mixed = '') {
        const fileDir = path.parse(file).dir;

        if (fileDir) {
            this.createDirSync(fileDir);
        }

        const filePath = this.absolutePath(file);
        const fileContents = createFileParseContents(contents);

        fs.writeFileSync(filePath, fileContents);
    }

    deleteFile(file: string) {
        const filePath = this.absolutePath(file);

        if (filePath === this.dir) {
            throw new Error(
                'Use sandbox.destroySandbox() to delete the sandbox.',
            );
        }

        const removed = del(file, {
            root: this.dir,
            cwd: this.dir,
            dot: true,
        });

        return removed;
    }

    deleteFileSync(file: string) {
        const filePath = this.absolutePath(file);

        if (filePath === this.dir) {
            throw new Error(
                'Use sandbox.destroySandbox() to delete the sandbox.',
            );
        }

        const removed = del.sync(file, {
            root: this.dir,
            cwd: this.dir,
            dot: true,
        });

        return removed;
    }

    async readFile(file: string) {
        const filePath = this.absolutePath(file);
        let contents = await readFile(filePath, 'utf8');

        try {
            contents = contents.trim();
            contents = JSON.parse(contents);
            // eslint-disable-next-line no-empty
        } catch (e) {}

        return contents;
    }

    readFileSync(file: string) {
        const filePath = this.absolutePath(file);

        let contents = fs.readFileSync(filePath, 'utf8');

        try {
            contents = contents.trim();
            contents = JSON.parse(contents);
            // eslint-disable-next-line no-empty
        } catch (e) {}

        return contents;
    }

    async getFileHash(file: string) {
        const filePath = this.absolutePath(file);
        const contents = await readFile(filePath);

        const fileHash = getFileHash(contents);

        return fileHash;
    }

    getFileHashSync(file: string) {
        const filePath = this.absolutePath(file);
        const contents = fs.readFileSync(filePath);

        const fileHash = getFileHash(contents);

        return fileHash;
    }

    async getFileList() {
        const fileList = await readDirDeep(this.dir);

        const normalizedList = fileList.map((file) => {
            const normalizedPath = slash(file);

            return normalizedPath;
        });

        return normalizedList;
    }

    getFileListSync() {
        const fileList = readDirDeep.sync(this.dir).map((file) => {
            const normalizedPath = slash(file);

            return normalizedPath;
        });

        return fileList;
    }

    async getAllFilesHash() {
        const fileList = await this.getFileList();

        const result = {};
        const pending = fileList.map(async (file) => {
            const hash = await this.getFileHash(file);

            result[file] = hash;
        });

        await Promise.all(pending);

        return result;
    }

    getAllFilesHashSync() {
        const fileList = this.getFileListSync();
        const result = fileList.reduce((acc, file) => {
            const fileHash = this.getFileHashSync(file);
            return {
                ...acc,
                [file]: fileHash,
            };
        }, {});

        return result;
    }

    async clean() {
        try {
            const removed = await del('**/*', {
                root: this.dir,
                cwd: this.dir,
                dot: true,
            });

            return removed;
        } catch (error) {
            /**
             * Intermittently error code 'EINVAL' is being thrown here.
             * Would be great to find out why
             * Test will fail only if validating removed files.
             * Retry once
             */
            if (error.code === 'EINVAL') {
                const removed = del('**/*', {
                    root: this.dir,
                    cwd: this.dir,
                    dot: true,
                });

                return removed;
            }

            throw error;
        }
    }

    cleanSync() {
        const removed = del.sync('**/*', {
            root: this.dir,
            cwd: this.dir,
            dot: true,
        });

        return removed;
    }

    async destroySandbox() {
        const removed = await del(this.dir, { force: true });

        for (const key of Object.keys(this)) {
            if (key === 'dir') {
                delete this.dir;
            } else {
                // $FlowIssue
                this[key] = sandboxDestroyed;
            }
        }

        return removed;
    }

    destroySandboxSync() {
        const removed = del.sync(this.dir, { force: true });

        for (const key of Object.keys(this)) {
            if (key === 'dir') {
                delete this.dir;
            } else {
                // $FlowIssue
                this[key] = sandboxDestroyed;
            }
        }

        return removed;
    }
}

module.exports = TempSandbox;

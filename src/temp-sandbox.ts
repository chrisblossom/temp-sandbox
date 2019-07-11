import path from 'path';
import os from 'os';
import fs from 'fs';
import { createHash } from 'crypto';
import { promisify } from 'util';
import makeDir, { sync as makeDirSync } from 'make-dir';
import parentModule from 'parent-module';
import readPkgUp from 'read-pkg-up';
import { readDirDeep, readDirDeepSync } from 'read-dir-deep';
import { del } from './utils/del';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

function getFileHash(contents: Buffer): string {
	const hash = createHash('md5')
		.update(contents)
		.digest('hex');

	return hash;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createFileParseContents(contents: any = ''): string {
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

function sandboxDestroyed(): void {
	throw new Error('sandbox has been destroyed. Create new instance');
}

// https://stackoverflow.com/a/1527820
function getRandomInteger(min: number = 1, max: number = 100): number {
	const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min;

	return randomInteger;
}

interface Options {
	randomDir?: boolean;
}

class TempSandbox {
	public readonly dir: string;

	private warnings: {
		absolutePathDeprecated: boolean;
		deleteFileDeprecated: boolean;
	};

	public constructor(options: Options = {}) {
		const opts = {
			randomDir: false,
			...options,
		};

		const tempDir = fs.realpathSync(os.tmpdir());
		const parent =
			parentModule() || `PARENT-NOT-FOUND-${getRandomInteger()}`;

		const relativeParent = path.relative(process.cwd(), parent);
		const relativeParentParsed = path.parse(relativeParent);

		const relateParentStrippedExt = path.join(
			relativeParentParsed.dir,
			relativeParentParsed.name,
		);

		/**
		 * create base directory based on package name
		 */
		const packageJson = readPkgUp.sync({
			cwd: parent,
			normalize: false,
		});

		const baseDirId =
			packageJson && packageJson.package && packageJson.package.name
				? packageJson.package.name
						// replace special characters for directory name
						.replace(/[^a-zA-Z0-9]/g, '-')
				: null;

		if (baseDirId === null) {
			throw new Error('package name not found');
		}

		const dirId =
			opts.randomDir === false ? 'dir' : getRandomInteger().toString();

		const baseDir = path.resolve(tempDir, `${baseDirId}-sandbox`);

		/**
		 * Each temp directory will be unique to the file
		 */
		this.dir = path.resolve(baseDir, `${relateParentStrippedExt}-${dirId}`);

		// Remove target temp directory if it already exists
		if (fs.existsSync(this.dir)) {
			del.sync(this.dir, { force: true });
		}

		// create sandbox directory
		makeDirSync(this.dir);

		this.warnings = {
			absolutePathDeprecated: false,
			deleteFileDeprecated: false,
		};

		this.absolutePath = this.absolutePath.bind(this);

		this.path.relative = this.path.relative.bind(this);
		this.path.resolve = this.path.resolve.bind(this);

		this.createDir = this.createDir.bind(this);
		this.createDirSync = this.createDirSync.bind(this);

		this.createFile = this.createFile.bind(this);
		this.createFileSync = this.createFileSync.bind(this);

		this.delete = this.delete.bind(this);
		this.deleteSync = this.deleteSync.bind(this);
		this.deleteFile = this.deleteFile.bind(this);
		this.deleteFileSync = this.deleteFileSync.bind(this);

		this.readFile = this.readFile.bind(this);
		this.readFileSync = this.readFileSync.bind(this);

		this.getFileHash = this.getFileHash.bind(this);
		this.getFileHashSync = this.getFileHashSync.bind(this);

		this.getFileList = this.getFileList.bind(this);
		this.getFileListSync = this.getFileListSync.bind(this);

		this.getAllFilesHash = this.getAllFilesHash.bind(this);
		this.getAllFilesHashSync = this.getAllFilesHashSync.bind(this);

		this.clean = this.clean.bind(this);
		this.cleanSync = this.cleanSync.bind(this);

		this.destroySandbox = this.destroySandbox.bind(this);
		this.destroySandboxSync = this.destroySandboxSync.bind(this);
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public path = {
		resolve: (dir: string): string => {
			const absolute = path.resolve(this.dir, dir);
			const relative = path.relative(this.dir, absolute);

			const isOutside =
				relative !== '' ? relative.split('..')[0] === '' : false;

			if (isOutside) {
				throw new Error(`${dir} is outside sandbox`);
			}

			// Treat the directory as if it is the root of the filesystem
			const base = path.join('/', relative);

			const joinWithBase = path.join(this.dir, base);

			return path.resolve(joinWithBase);
		},

		relative: (dir1: string, dir2?: string): string => {
			const from = dir2 ? this.path.resolve(dir1) : this.dir;
			const to = dir2 ? this.path.resolve(dir2) : this.path.resolve(dir1);

			const relative = path.relative(from, to);

			return relative;
		},
	};

	public absolutePath(dir: string): string {
		if (this.warnings.absolutePathDeprecated === false) {
			// eslint-disable-next-line no-console
			console.warn(
				'absolutePath has been deprecated. Please use sandbox.path.resolve',
			);

			this.warnings.absolutePathDeprecated = true;
		}

		return this.path.resolve(dir);
	}

	public async createDir(dir: string): Promise<string> {
		const normalized = this.path.resolve(dir);
		const dirCreated = await makeDir(normalized);

		return this.path.relative(dirCreated);
	}

	public createDirSync(dir: string): string {
		const normalized = this.path.resolve(dir);

		const dirCreated = makeDirSync(normalized);

		return this.path.relative(dirCreated);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async createFile(file: string, contents: any = ''): Promise<void> {
		const fileDir = path.parse(file).dir;

		if (fileDir) {
			await this.createDir(fileDir);
		}

		const filePath = this.path.resolve(file);
		const fileContents = createFileParseContents(contents);
		await writeFile(filePath, fileContents);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public createFileSync(file: string, contents: any = ''): void {
		const fileDir = path.parse(file).dir;

		if (fileDir) {
			this.createDirSync(fileDir);
		}

		const filePath = this.path.resolve(file);
		const fileContents = createFileParseContents(contents);

		fs.writeFileSync(filePath, fileContents);
	}

	public async delete(patterns: string | string[]): Promise<string[]> {
		(Array.isArray(patterns) ? patterns : [patterns]).forEach(
			(pattern): void => {
				const filePath = this.path.resolve(pattern);

				if (filePath === this.dir) {
					throw new Error(
						'Use sandbox.destroySandbox() to delete the sandbox.',
					);
				}
			},
		);

		const removed = await del(patterns, {
			cwd: this.dir,
			dot: true,
			force: true,
		});

		return removed.map((removedFiles): string => {
			return this.path.relative(removedFiles);
		});
	}

	public async deleteFile(patterns: string | string[]): Promise<string[]> {
		if (this.warnings.deleteFileDeprecated === false) {
			// eslint-disable-next-line no-console
			console.warn(
				'deleteFile has been deprecated. Use sandbox.delete instead',
			);

			this.warnings.deleteFileDeprecated = true;
		}

		return this.delete(patterns);
	}

	public deleteSync(patterns: string | string[]): string[] {
		(Array.isArray(patterns) ? patterns : [patterns]).forEach(
			(pattern): void => {
				const filePath = this.path.resolve(pattern);

				if (filePath === this.dir) {
					throw new Error(
						'Use sandbox.destroySandboxSync() to delete the sandbox.',
					);
				}
			},
		);

		const removed = del.sync(patterns, {
			cwd: this.dir,
			dot: true,
			force: true,
		});

		return removed.map((removedFiles: string): string => {
			return this.path.relative(removedFiles);
		});
	}

	public deleteFileSync(patterns: string | string[]): string[] {
		if (this.warnings.deleteFileDeprecated === false) {
			// eslint-disable-next-line no-console
			console.warn(
				'deleteFileSync has been deprecated. Use sandbox.deleteSync instead',
			);

			this.warnings.deleteFileDeprecated = true;
		}

		return this.deleteSync(patterns);
	}

	public async readFile(file: string): Promise<unknown> {
		const filePath = this.path.resolve(file);
		let contents = await readFile(filePath, 'utf8');

		try {
			contents = contents.trim();
			contents = JSON.parse(contents);
			// eslint-disable-next-line no-empty
		} catch (e) {}

		return contents;
	}

	public readFileSync(file: string): unknown {
		const filePath = this.path.resolve(file);

		let contents = fs.readFileSync(filePath, 'utf8');

		try {
			contents = contents.trim();
			contents = JSON.parse(contents);
			// eslint-disable-next-line no-empty
		} catch (e) {}

		return contents;
	}

	public async getFileHash(file: string): Promise<string> {
		const filePath = this.path.resolve(file);
		const contents = await readFile(filePath);

		const fileHash = getFileHash(contents);

		return fileHash;
	}

	public getFileHashSync(file: string): string {
		const filePath = this.path.resolve(file);
		const contents = fs.readFileSync(filePath);

		const fileHash = getFileHash(contents);

		return fileHash;
	}

	public async getFileList(dir?: string): Promise<string[]> {
		const readDir = dir ? this.path.resolve(dir) : this.dir;

		const fileList = await readDirDeep(readDir, {
			cwd: this.dir,
			absolute: false,
			ignore: [],
			gitignore: false,
		});

		return fileList;
	}

	public getFileListSync(dir?: string): string[] {
		const readDir = dir ? this.path.resolve(dir) : this.dir;
		const fileList = readDirDeepSync(readDir, {
			cwd: this.dir,
			absolute: false,
			ignore: [],
			gitignore: false,
		});

		return fileList;
	}

	public async getAllFilesHash(
		dir?: string,
	): Promise<{ [key: string]: string }> {
		const fileList = await this.getFileList(dir);

		const result: { [key: string]: string } = {};
		const pending = fileList.map(
			async (file: string): Promise<void> => {
				const hash = await this.getFileHash(file);

				result[file] = hash;
			},
		);

		await Promise.all(pending);

		const sortedResult = Object.keys(result)
			.sort((a: string, b: string): number => {
				return a.localeCompare(b);
			})
			.reduce((acc, item): { [key: string]: string } => {
				return { ...acc, [item]: result[item] };
			}, {});

		return sortedResult;
	}

	public getAllFilesHashSync(dir?: string): { [key: string]: string } {
		const fileList = this.getFileListSync(dir);

		const result: { [key: string]: string } = fileList.reduce(
			(
				acc: { [key: string]: string },
				file: string,
			): { [key: string]: string } => {
				const fileHash = this.getFileHashSync(file);

				return {
					...acc,
					[file]: fileHash,
				};
			},
			{},
		);

		const sortedResult = Object.keys(result)
			.sort((a: string, b: string): number => {
				return a.localeCompare(b);
			})
			.reduce((acc, item): { [key: string]: string } => {
				return { ...acc, [item]: result[item] };
			}, {});

		return sortedResult;
	}

	public async clean(): Promise<string[]> {
		const removed = await del('**/*', {
			cwd: this.dir,
			dot: true,
			force: true,
		});

		return removed.map((removedFiles): string => {
			return this.path.relative(removedFiles);
		});
	}

	public cleanSync(): string[] {
		const removed = del.sync('**/*', {
			cwd: this.dir,
			dot: true,
			force: true,
		});

		return removed.map((removedFiles: string): string => {
			return this.path.relative(removedFiles);
		});
	}

	public async destroySandbox(): Promise<string[]> {
		const removed = await del(this.dir, { force: true });

		for (const key of Object.keys(this)) {
			if (key === 'dir') {
				// @ts-ignore
				delete this.dir;
			} else {
				// @ts-ignore
				this[key] = sandboxDestroyed;
			}
		}

		return removed;
	}

	public destroySandboxSync(): string[] {
		const removed = del.sync(this.dir, { force: true });

		for (const key of Object.keys(this)) {
			if (key === 'dir') {
				// @ts-ignore
				delete this.dir;
			} else {
				// @ts-ignore
				this[key] = sandboxDestroyed;
			}
		}

		return removed;
	}
}

export { TempSandbox };

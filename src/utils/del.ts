import path from 'path';
import delActual, { sync as DelSync, Options } from 'del';
import slash from 'slash';

async function del(
	patterns: string | readonly string[],
	options: Options = {},
): ReturnType<typeof delActual> {
	// workaround for https://github.com/sindresorhus/del/issues/68
	let removeTheseFiles = await delActual(patterns, {
		...options,
		dryRun: true,
	});

	removeTheseFiles = removeTheseFiles.map((file): string => {
		return slash(file);
	});

	try {
		const removed = await delActual(removeTheseFiles, options);

		return removed;
	} catch (error) {
		/**
		 * Intermittently error code 'EINVAL' is being thrown here.
		 * Would be great to find out why
		 * Test will fail only if validating removed files.
		 */
		if (error.code === 'EINVAL') {
			// when the EINVAL happens, the files are usually removed 90% of the time. Run delActual again to get the remaining 10%
			await delActual(removeTheseFiles, options);

			// del returns absolute files with system's path.sep
			return removeTheseFiles.map((file): string => {
				return path.resolve(file);
			});
		}

		throw error;
	}
}

// EINVAL does not happen async
del.sync = DelSync;

export { del };

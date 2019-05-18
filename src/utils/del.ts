import delActual, { sync as DelSync, Options } from 'del';

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function del(
    patterns: string | ReadonlyArray<string>,
    options?: Options,
): ReturnType<typeof delActual> {
    try {
        const removed = await delActual(patterns, options);

        return removed;
    } catch (error) {
        /**
         * Intermittently error code 'EINVAL' is being thrown here.
         * Would be great to find out why
         * Test will fail only if validating removed files.
         * Retry twice with 100ms between each try
         */
        if (error.code === 'EINVAL') {
            await sleep(100);

            try {
                const removed = await delActual(patterns, options);

                return removed;
            } catch (error2) {
                await sleep(100);

                if (error2.code === 'EINVAL') {
                    const removed = await delActual(patterns, options);

                    return removed;
                }

                throw error2;
            }
        }

        throw error;
    }
}

// EINVAL does not happen async
del.sync = DelSync;

export { del };

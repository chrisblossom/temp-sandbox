import fs, { PathLike, WriteFileOptions } from 'fs';

function writeFile(
    file: PathLike | number,
    data: any,
    options: WriteFileOptions = {},
): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, options, (error) => {
            if (error) {
                reject(error);

                return;
            }

            resolve();
        });
    });
}

function readFile(
    file: PathLike | number,
    options?: { encoding?: null; flag?: string } | BufferEncoding,
): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, options, (error, data) => {
            if (error) {
                reject(error);

                return;
            }

            resolve(data);
        });
    });
}

export { writeFile, readFile };

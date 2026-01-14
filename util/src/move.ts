import fs from "fs/promises";
import { join, basename } from "path";

/**
 * Move a file to a directory, maintaing the same name.
 */
export const move = (file: string, directory: string) => {
    return fs.rename(file, join(directory, basename(file)));
};

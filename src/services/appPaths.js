/**
 * @file appPaths.js
 * @description Single source of truth for resolving the application's data directories.
 *
 * All runtime data (the SQLite database and extracted export archives) lives under
 * the Electron `userData` directory in BOTH development and production. Keeping data
 * out of the project/source tree means:
 *   1. Imported chat content can never be bundled into packaged builds
 *      (electron-builder packages `src/**`).
 *   2. Imported chat content can never be accidentally committed to git.
 *   3. There is exactly one platform-correct, user-writable data location.
 *
 *     Windows: C:\Users\<user>\AppData\Roaming\<app>\
 *     macOS:   ~/Library/Application Support/<app>/
 *     Linux:   ~/.config/<app>/
 */

import path from "path";

/**
 * Resolves the base directory where extracted WhatsApp export archives are stored.
 *
 * @param {string} userDataPath - OS user-data directory supplied by the Electron main
 *   process (`app.getPath("userData")`).
 * @returns {string} Absolute path to the imports directory (`<userDataPath>/imports`).
 */
export function getImportsBaseDir(userDataPath) {
    if (!userDataPath) {
        throw new Error("userDataPath is required to resolve the imports directory.");
    }
    return path.join(userDataPath, "imports");
}

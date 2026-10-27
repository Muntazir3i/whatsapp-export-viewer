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

/**
 * Resolves a chat's extraction folder inside the imports directory.
 *
 * Chat names come from export file names or user-provided custom renames, so a
 * name containing path separators or `..` must never escape `<userData>/imports`.
 *
 * @param {string} userDataPath - OS user-data directory supplied by the Electron main process.
 * @param {string} chatName - Contact name or user-provided custom name.
 * @returns {string} Absolute path to the chat folder.
 * @throws {Error} When the name is empty or would resolve outside the imports directory.
 */
export function resolveChatFolder(userDataPath, chatName) {
    const importsRoot = path.resolve(getImportsBaseDir(userDataPath));
    const folderName = String(chatName ?? "").trim();

    if (
        !folderName ||
        /^\.+$/.test(folderName) ||
        path.isAbsolute(folderName) ||
        folderName.includes("/") ||
        folderName.includes("\\")
    ) {
        throw new Error(`Invalid chat name: "${chatName}"`);
    }

    const folderPath = path.resolve(importsRoot, folderName);
    if (!folderPath.startsWith(importsRoot + path.sep)) {
        throw new Error(`Invalid chat name: "${chatName}"`);
    }
    return folderPath;
}

/**
 * Resolves a stored message media path to an absolute filesystem path.
 *
 * New rows store a path relative to the imports directory; legacy rows store an
 * absolute path. Both are accepted, but the result must stay inside
 * `<userDataPath>/imports` so the renderer cannot read arbitrary files through
 * the `media://` protocol.
 *
 * @param {string} userDataPath - OS user-data directory supplied by the Electron main process.
 * @param {string} storedPath - Path as stored in `messages.message`.
 * @returns {string|null} Absolute path, or `null` when the path is missing or outside the imports directory.
 */
export function resolveMediaPath(userDataPath, storedPath) {
    if (!storedPath || typeof storedPath !== "string") return null;

    const importsRoot = path.resolve(getImportsBaseDir(userDataPath));
    const absolutePath = path.isAbsolute(storedPath)
        ? path.resolve(storedPath)
        : path.resolve(importsRoot, storedPath);

    if (!absolutePath.startsWith(importsRoot + path.sep)) return null;
    return absolutePath;
}

/**
 * Converts an absolute media path into the value stored in the database.
 *
 * Paths inside the imports directory are stored relative to it (so the data
 * keeps working if the userData directory changes); everything else is stored
 * as an absolute path.
 *
 * @param {string} userDataPath - OS user-data directory supplied by the Electron main process.
 * @param {string} absolutePath - Absolute path to the media file.
 * @returns {string} Import-root-relative path with forward slashes, or the absolute path.
 */
export function toStoredMediaPath(userDataPath, absolutePath) {
    const importsRoot = path.resolve(getImportsBaseDir(userDataPath));
    const resolved = path.resolve(absolutePath);

    if (!resolved.startsWith(importsRoot + path.sep)) return resolved;

    return path.relative(importsRoot, resolved).split(path.sep).join("/");
}

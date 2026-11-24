/**
 * @file importChat.js
 * @description Service for resolving WhatsApp export file locations, handling ZIP extraction,
 * and locating target text files across both development and production environments.
 */

import yauzl from "yauzl";
import path from "path";
import { createWriteStream, existsSync } from "fs";
import { readdir, mkdir, realpath, lstat } from "fs/promises";
import { pipeline } from "stream/promises";
import { resolveChatFolder } from "./appPaths.js";
import { extractChatFileInfo } from "../parser/importer.js";

/**
 * Prompts the user for a WhatsApp export file path (.zip or .txt) and resolves output extraction directory.
 *
 * @param {string} filePath - Path to target export file.
 * @param {string} [customName] - Optional custom name override provided by user.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 * @returns {Promise<{ filePath: string, importDir: string, isZip: boolean }>} File location descriptor object.
 */
export async function grabFileLocation(filePath, customName, userDataPath) {
    const targetPath = filePath.trim().replace(/^['"]|['"]$/g, ""); // strip accidental quotes

    if (!targetPath) {
        throw new Error("No file path provided.");
    }

    if (!existsSync(targetPath)) {
        throw new Error(`Specified file path does not exist: "${targetPath}"`);
    }

    const [_, contact] = extractChatFileInfo(targetPath);
    const folderName = customName ? customName.trim() : contact;
    const importDir = resolveChatFolder(userDataPath, folderName);

    const isZip = targetPath.toLowerCase().endsWith(".zip");

    return { filePath: targetPath, importDir, isZip };
}

/**
 * Opens a ZIP archive for lazy, entry-by-entry reading.
 *
 * @param {string} zipFilePath
 * @returns {Promise<import("yauzl").ZipFile>}
 */
function openZip(zipFilePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) reject(err);
            else resolve(zipfile);
        });
    });
}

/**
 * Opens the decompressed stream for a single ZIP entry.
 *
 * @param {import("yauzl").ZipFile} zipfile
 * @param {import("yauzl").Entry} entry
 * @returns {Promise<import("stream").Readable>}
 */
function openEntryStream(zipfile, entry) {
    return new Promise((resolve, reject) => {
        zipfile.openReadStream(entry, (err, stream) => {
            if (err) reject(err);
            else resolve(stream);
        });
    });
}

/**
 * Returns true for entries that could escape the extraction root or create a
 * symlink. Symlinks are rejected outright because a later entry could write
 * through the link outside the imports directory.
 *
 * @param {Object} entry - A yauzl entry.
 * @returns {boolean}
 */
export function isUnsafeZipEntry(entry) {
    const name = entry?.fileName;
    if (typeof name !== "string" || name.length === 0 || name.includes("\0")) {
        return true;
    }

    const normalized = name.replace(/\\/g, "/");
    if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
        return true;
    }
    if (normalized.split("/").includes("..")) {
        return true;
    }

    const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
    return (mode & 0o170000) === 0o120000;
}

/**
 * Extracts a ZIP archive into the specified destination directory.
 *
 * Rejects symlink entries, absolute paths, and `..` traversal before writing.
 * Files are written only after their parent resolves inside the destination.
 *
 * @param {string} zipFilePath - Absolute or relative path to the ZIP archive.
 * @param {string} outputDir - Destination directory for extracted contents.
 * @param {Function} [onProgress] - Optional callback `(entriesProcessed, totalEntries, fileName) => void`.
 */
export async function extractZip(zipFilePath, outputDir, onProgress) {
    try {
        const root = path.resolve(outputDir);
        await mkdir(root, { recursive: true });
        const realRoot = await realpath(root);
        const zipfile = await openZip(zipFilePath);
        let entriesProcessed = 0;

        await new Promise((resolve, reject) => {
            let settled = false;

            const fail = (err) => {
                if (settled) return;
                settled = true;
                try {
                    zipfile.close();
                } catch {
                    // Already closed by yauzl.
                }
                reject(err);
            };

            zipfile.on("error", fail);
            zipfile.on("end", () => {
                if (settled) return;
                settled = true;
                resolve();
            });

            zipfile.on("entry", async (entry) => {
                if (settled) return;

                try {
                    if (entry.fileName.startsWith("__MACOSX/")) {
                        zipfile.readEntry();
                        return;
                    }

                    if (isUnsafeZipEntry(entry)) {
                        throw new Error(`Unsafe ZIP entry rejected: "${entry.fileName}"`);
                    }

                    const normalized = entry.fileName.replace(/\\/g, "/");
                    const dest = path.join(realRoot, normalized);
                    const relative = path.relative(realRoot, dest);
                    if (relative.startsWith("..") || path.isAbsolute(relative)) {
                        throw new Error(`ZIP entry escapes the import directory: "${entry.fileName}"`);
                    }

                    const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
                    const isDir = normalized.endsWith("/") || (mode & 0o170000) === 0o040000;
                    const parent = path.dirname(dest);

                    await mkdir(parent, { recursive: true });
                    const parentReal = await realpath(parent);
                    const parentRelative = path.relative(realRoot, parentReal);
                    if (parentRelative.startsWith("..") || path.isAbsolute(parentRelative)) {
                        throw new Error(`ZIP entry escapes the import directory: "${entry.fileName}"`);
                    }

                    const existing = await lstat(dest).catch(() => null);
                    if (existing?.isSymbolicLink()) {
                        throw new Error(`Refusing to overwrite symlink: "${entry.fileName}"`);
                    }

                    if (isDir) {
                        await mkdir(dest, { recursive: true, mode: (mode & 0o777) || 0o755 });
                    } else {
                        const readStream = await openEntryStream(zipfile, entry);
                        await pipeline(readStream, createWriteStream(dest, { mode: (mode & 0o777) || 0o644 }));
                    }

                    entriesProcessed++;
                    if (onProgress) {
                        onProgress(entriesProcessed, zipfile.entryCount, entry.fileName);
                    }
                    zipfile.readEntry();
                } catch (err) {
                    fail(err);
                }
            });

            zipfile.readEntry();
        });
    } catch (err) {
        console.error("\n❌ Failed to extract ZIP archive:", err.message);
        throw err;
    }
}

/**
 * Finds the exported WhatsApp chat text file inside an extracted directory.
 * Filters out hidden files, macOS metadata directories (__MACOSX), and AppleDouble files (._*).
 *
 * @param {string} importDir - Directory containing extracted ZIP contents.
 * @returns {Promise<string>} Path to the located chat text file.
 */
export async function findChatFile(importDir) {
    const items = await readdir(importDir, { withFileTypes: true });

    // Collect valid .txt files in the root of the extracted directory
    const validTxtFiles = [];

    for (const item of items) {
        if (item.name.startsWith(".") || item.name.startsWith("._") || item.name === "__MACOSX") {
            continue;
        }
        if (item.isFile() && item.name.toLowerCase().endsWith(".txt")) {
            validTxtFiles.push(path.join(importDir, item.name));
        }
    }

    if (validTxtFiles.length > 0) {
        // Prioritize standard names like _chat.txt or names starting with WhatsApp Chat
        const preferred = validTxtFiles.find(f => {
            const base = path.basename(f).toLowerCase();
            return base === "_chat.txt" || base.startsWith("whatsapp chat") || base.includes("chat");
        });
        return preferred || validTxtFiles[0];
    }

    // Inspect one level of subdirectories if files were unpacked into an inner folder
    for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith(".") && item.name !== "__MACOSX") {
            const subDir = path.join(importDir, item.name);
            const subItems = await readdir(subDir);
            const subTxt = subItems.find(f => !f.startsWith(".") && !f.startsWith("._") && f.toLowerCase().endsWith(".txt"));
            if (subTxt) {
                return path.join(subDir, subTxt);
            }
        }
    }

    throw new Error(`No WhatsApp chat text (.txt) file found in "${importDir}".`);
}
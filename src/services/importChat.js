/**
 * @file importChat.js
 * @description Service for resolving WhatsApp export file locations, handling ZIP extraction,
 * and locating target text files across both development and production environments.
 */

import extract from "extract-zip";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { readdir } from "fs/promises";
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
 * Extracts a ZIP archive into the specified destination directory with entry progress reporting.
 *
 * @param {string} zipFilePath - Absolute or relative path to the ZIP archive.
 * @param {string} outputDir - Destination directory for extracted contents.
 * @param {Function} [onProgress] - Optional callback `(entriesProcessed, totalEntries, fileName) => void`.
 */
export async function extractZip(zipFilePath, outputDir, onProgress) {
    try {
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        let entriesProcessed = 0;

        await extract(zipFilePath, {
            dir: path.resolve(outputDir),
            onEntry: (entry, zipfile) => {
                entriesProcessed++;
                if (onProgress) {
                    onProgress(entriesProcessed, zipfile.entryCount, entry.fileName);
                }
            }
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
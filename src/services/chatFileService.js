import fs from "node:fs/promises";
import { resolveChatFolder } from "./appPaths.js";

/**
 * Deletes the extracted files folder for a specific chat.
 * Stored under `<userData>/imports` in both development and production.
 *
 * @param {string} chatName - Contact or custom chat name representing the folder.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 */
export async function deleteChatFiles(chatName, userDataPath) { 
    if (!chatName) return;

    let folderPath;
    try {
        folderPath = resolveChatFolder(userDataPath, chatName);
    } catch (err) {
        console.error(`Refusing to delete invalid chat folder "${chatName}":`, err.message);
        return;
    }
    
    try {
        await fs.rm(folderPath, {
            recursive: true,
            force: true, // Do not throw if directory does not exist (e.g. .txt import)
        });
    } catch (err) {
        console.error(`Error deleting folder ${folderPath}:`, err.message);
    }
}

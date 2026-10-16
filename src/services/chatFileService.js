import fs from "node:fs/promises";
import path from "node:path";
import { getImportsBaseDir } from "./appPaths.js";

/**
 * Deletes the extracted files folder for a specific chat.
 * Stored under `<userData>/imports` in both development and production.
 *
 * @param {string} chatName - Contact or custom chat name representing the folder.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 */
export async function deleteChatFiles(chatName, userDataPath) { 
    if (!chatName) return;

    const folderPath = path.join(getImportsBaseDir(userDataPath), chatName);       
    
    try {
        await fs.rm(folderPath, {
            recursive: true,
            force: true, // Do not throw if directory does not exist (e.g. .txt import)
        });

        console.log(`Folder deleted successfully: ${folderPath}`);
    } catch (err) {
        console.error(`Error deleting folder ${folderPath}:`, err.message);
    }
}

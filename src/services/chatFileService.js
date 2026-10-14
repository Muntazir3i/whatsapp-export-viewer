import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Deletes the extracted files folder for a specific chat.
 * Works seamlessly in development (`src/data/imports`) and production (`<userData>/imports`).
 *
 * @param {string} chatName - Contact or custom chat name representing the folder.
 * @param {string|null} [userDataPath=null] - Optional OS userData directory in production.
 */
export async function deleteChatFiles(chatName, userDataPath = null) { 
    if (!chatName) return;

    const baseDir = userDataPath 
        ? path.join(userDataPath, "imports")
        : fileURLToPath(new URL("../data/imports", import.meta.url));

    const folderPath = path.join(baseDir, chatName);       
    
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

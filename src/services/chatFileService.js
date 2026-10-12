import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function deleteChatFiles(chatName) { 
    const dataUrl = new URL('../data/imports', import.meta.url)
    const urlToPath = fileURLToPath(dataUrl)
    const folderPath = path.join(urlToPath, chatName);       
    
    try {
        await fs.rm(folderPath, {
            recursive: true,
            force: true,
        });

        console.log("Folder deleted successfully!");
    } catch (err) {
        throw new Error(`Error deleting folder: ${err.message}`, {
            cause: err,
        });
    }
}


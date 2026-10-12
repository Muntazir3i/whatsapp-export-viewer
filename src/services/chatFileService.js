import fs from "node:fs/promises";
import path from "node:path";

export async function deleteChatFiles(chatName) {
    const folderPath = path.join("../data/imports", chatName);

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



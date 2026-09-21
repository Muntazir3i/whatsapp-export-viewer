import { ipcMain, dialog } from "electron";
import { main } from "../../src/index.js";

/**
 * Opens OS native file picker dialog for selecting a WhatsApp chat export file (.zip or .txt).
 *
 * @returns {Promise<Electron.OpenDialogReturnValue>} Dialog selection result object.
 */
async function showDialogue() {
  const result = await dialog.showOpenDialog({
    title: "Select WhatsApp Export File",
    properties: ["openFile"],
    filters: [
      { name: "WhatsApp Export Files (*.zip, *.txt)", extensions: ["zip", "txt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  return result;
}

/**
 * Registers IPC handlers for importing WhatsApp chat exports.
 * Channel: "import-chat"
 *
 * @param {import('better-sqlite3').Database} db - SQLite database instance.
 */
export function registerImportHandlers(db) {
  ipcMain.handle("import-chat", async () => {
    try {
      // 1. Open native OS file picker
      const dialogResult = await showDialogue();

      // 2. Handle user cancellation (e.g., clicking Cancel in file picker)
      if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedFilePath = dialogResult.filePaths[0];

      // 3. Execute ETL parsing & database insertion pipeline
      let result = await main(selectedFilePath, db);  

    
      // 4. Return success result object
      return { exist: result, success: true, filePath: selectedFilePath };
    } catch (err) {
      console.error("\n❌ Import pipeline execution failed:", err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
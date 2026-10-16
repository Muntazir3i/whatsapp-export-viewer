import { ipcMain, dialog } from "electron";
import { main } from "../../src/index.js";

/**
 * Opens OS native file picker dialog for selecting a WhatsApp chat export file (.zip or .txt).
 *
 * @returns {Promise<Electron.OpenDialogReturnValue>} Dialog selection result object containing user file choices.
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
 * Handles primary import triggers ("import-chat") and custom rename imports ("import-chat-with-name").
 *
 * @param {import('better-sqlite3').Database} db - Active SQLite database instance.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 */
export function registerImportHandlers(db, userDataPath) {
  /**
   * Channel: "import-chat"
   * Prompts file picker dialog and executes standard ETL pipeline or collision check.
   */
  ipcMain.handle("import-chat", async (event) => {
    try {
      // 1. Open native OS file picker
      const dialogResult = await showDialogue();

      // 2. Handle user cancellation (e.g., clicking Cancel in file picker)
      if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedFilePath = dialogResult.filePaths[0];

      // 3. Execute ETL parsing & database insertion pipeline, streaming progress to the renderer
      const onProgress = (payload) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("import-progress", payload);
        }
      };
      let result = await main(selectedFilePath, db, null, userDataPath, onProgress);

      // 4. Return success result object with existence status and file path
      return { exist: result, success: true, filePath: selectedFilePath };
    } catch (err) {
      console.error("\n❌ Import pipeline execution failed:", err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  });

  /**
   * Channel: "import-chat-with-name"
   * Bypasses name check and executes ETL pipeline using a specified custom chat name.
   *
   * @param {Object} _ - IPC event object (unused).
   * @param {string} filePath - Path to target export file on disk.
   * @param {string} customName - User-provided custom chat name.
   */
  ipcMain.handle("import-chat-with-name", async (event, filePath, customName) => {
    try {
      // Execute ETL pipeline overriding original metadata name with customName
      const onProgress = (payload) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("import-progress", payload);
        }
      };
      let result = await main(filePath, db, customName, userDataPath, onProgress);

      return { exist: result, success: true, filePath: filePath };
    } catch (err) {
      console.error("\n❌ Import with custom name pipeline failed:", err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
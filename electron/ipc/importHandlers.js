import { ipcMain, dialog } from "electron";
import { main } from "../../src/index.js";


async function showDialogue() {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"]
  });

  return result
}

export function registerImportHandlers() {

  ipcMain.handle("import-chat", async () => {
    let result = await showDialogue()

    await main(result.filePaths[0]).catch((err) => {
      console.error("\n❌ Pipeline execution failed:", err.message || err);
    });

  });

}
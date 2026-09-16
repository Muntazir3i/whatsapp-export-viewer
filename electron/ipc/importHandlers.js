import { ipcMain, dialog } from "electron";


async function showDialogue() {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"]
  });

  return result
}

export function registerImportHandlers(){

    ipcMain.handle("get-file-details", async () => {
       let result = await showDialogue()
       return result
    });
}
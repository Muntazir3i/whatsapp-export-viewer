import { ipcMain, dialog } from "electron";


async function showDialogue() {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"]
  });

  console.log(result);
}

export function registerImportHandlers(){

    ipcMain.handle("get-file-details", async () => {
       await showDialogue();
    });
}
import { app, BrowserWindow } from "electron";

function createWindow() {
    const window = new BrowserWindow({
        width: 1200,
        height: 800
    });

    window.loadURL("https://www.algondev.com/");
}

app.whenReady().then(() => {
    createWindow();
});
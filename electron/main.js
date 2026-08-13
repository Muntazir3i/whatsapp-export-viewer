import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { chatRepository } from "../src/db/chatRepository.js";
import { createDatabaseConnection } from "../src/db/database.js";
import { chatServices } from "../src/services/chatService.js";
import { createSchema } from "../src/db/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createDatabaseConnection();

createSchema(db)

const cr = new chatRepository(db)

const cs = new chatServices(cr)

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, "test.html"));
}

ipcMain.handle("get-app-version", () => {
    return "1.0.0";
});

ipcMain.handle("get-chats",() => {
    return cs.getChats()
})

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
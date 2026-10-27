import { app, BrowserWindow, protocol, net } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { chatRepository } from "../src/db/chatRepository.js";
import { createDatabaseConnection } from "../src/db/database.js";
import { chatServices } from "../src/services/chatService.js";
import { createSchema } from "../src/db/schema.js";
import { registerChatHandlers } from "./ipc/chatHandlers.js";
import { registerImportHandlers } from "./ipc/importHandlers.js";
import { resolveMediaPath } from "../src/services/appPaths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom scheme used to stream imported media (images, video, audio) to the
 * renderer. Chromium blocks `file://` subresources when the page is served from
 * the Vite dev server origin, so media must go through a privileged scheme.
 *
 * Must be registered before the app is ready.
 */
protocol.registerSchemesAsPrivileged([
    {
        scheme: "media",
        privileges: {
            standard: true,
            secure: true,
            stream: true,
            supportFetchAPI: true,
        },
    },
]);

/**
 * Detect whether the app is running in development mode.
 * Packaged builds always load the compiled renderer from disk.
 */
const isDev = !app.isPackaged;

// Store all runtime data (database + extracted exports) in the OS user-data
// directory in BOTH development and production. This keeps the source tree clean,
// guarantees imported chat content is never bundled into packaged builds, and
// provides a single platform-correct, user-writable location.
const userDataPath = app.getPath("userData");

// Initialize the SQLite database connection
const db = createDatabaseConnection("chats.db", userDataPath);

// Create tables if they don't already exist
createSchema(db);

// Initialize repository and service layers
const cr = new chatRepository(db);
const cs = new chatServices(cr);

/**
 * Creates the main BrowserWindow and loads the UI.
 * In development:  loads from the Vite dev server (hot reload).
 * In production:   loads from the compiled renderer/dist build on disk.
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        // Hide the default menu bar for a cleaner app feel
        autoHideMenuBar: true,
    });

    if (isDev) {
        // Development: connect to Vite dev server for hot module replacement
        win.loadURL("http://localhost:5174/");
        // Open DevTools automatically during development
        win.webContents.openDevTools();
    } else {
        // Production: load the compiled static build from renderer/dist
        win.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
    }
}

// Register all IPC handlers before the window is created
// userDataPath is the single data home for both the database and extracted files.
registerChatHandlers(cs, userDataPath);
registerImportHandlers(db, userDataPath);

app.whenReady().then(() => {
    // Serve stored media through `media://imports/?path=<stored path>`.
    // The stored path may be absolute (legacy rows) or relative to the imports directory.
    protocol.handle("media", async (request) => {
        try {
            const storedPath = new URL(request.url).searchParams.get("path");
            if (!storedPath) {
                return new Response("Bad request", { status: 400 });
            }

            const absolutePath = resolveMediaPath(userDataPath, storedPath);
            if (!absolutePath) {
                return new Response("Forbidden", { status: 403 });
            }

            return await net.fetch(pathToFileURL(absolutePath).toString());
        } catch (err) {
            console.error("❌ Failed to serve media:", err.message || err);
            return new Response("Not found", { status: 404 });
        }
    });

    createWindow();

    // macOS: re-create window when dock icon is clicked and no windows are open
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
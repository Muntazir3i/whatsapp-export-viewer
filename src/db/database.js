/**
 * @file database.js
 * @description
 * Creates and manages the application's SQLite database connection.
 *
 * DATABASE PATH STRATEGY:
 * - Development: stores `chats.db` in the project root (easy to inspect & debug).
 * - Production (packaged Electron app): stores `chats.db` in the OS user-data
 *   directory. The caller (electron/main.js) passes the userData path explicitly
 *   so this module stays synchronous and compatible with better-sqlite3:
 *
 *     Windows: C:\Users\<user>\AppData\Roaming\whatsapp-export-viewer\
 *     macOS:   ~/Library/Application Support/whatsapp-export-viewer/
 *     Linux:   ~/.config/whatsapp-export-viewer/
 *
 * This ensures the database file:
 *   1. Survives app updates (never bundled inside the ASAR package).
 *   2. Is located in a user-writable directory on all platforms.
 *   3. Is easy to find for backups or debugging.
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates and opens a SQLite database connection.
 *
 * @param {string} [dbName="chats.db"] - Name of the SQLite database file.
 * @param {string|null} [userDataPath=null] - Optional explicit directory for the DB file.
 *   Pass `app.getPath('userData')` from the Electron main process in production.
 *   When null, the project root is used (development / plain Node.js).
 * @returns {import("better-sqlite3").Database} An active `better-sqlite3` database instance.
 */
export function createDatabaseConnection(dbName = "chats.db", userDataPath = null) {
    // If a userDataPath is provided (production), store DB there.
    // Otherwise fall back to the project root (development).
    const dbDir = userDataPath ?? path.join(__dirname, "../../");
    const dbPath = path.join(dbDir, dbName);

    console.log(`Opening database: ${dbPath}`);

    const db = new Database(dbPath);

    // Enable SQLite foreign key constraint enforcement
    db.pragma("foreign_keys = ON");

    console.log("Database connected successfully.");

    return db;
}
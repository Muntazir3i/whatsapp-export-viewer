/**
 * @file database.js
 * @description
 * Creates and manages the application's SQLite database connection.
 *
 * DATABASE PATH STRATEGY:
 * - The database (`chats.db`) lives in the OS user-data directory in BOTH
 *   development and production. The caller (electron/main.js) always passes the
 *   userData path explicitly so this module stays synchronous and compatible with
 *   better-sqlite3:
 *
 *     Windows: C:\Users\<user>\AppData\Roaming\<app>\
 *     macOS:   ~/Library/Application Support/<app>/
 *     Linux:   ~/.config/<app>/
 *
 * This ensures the database file:
 *   1. Survives app updates (never bundled inside the ASAR package).
 *   2. Is located in a user-writable directory on all platforms.
 *   3. Is never written into the project/source tree during development.
 */

import Database from "better-sqlite3";
import path from "path";

/**
 * Creates and opens a SQLite database connection.
 *
 * @param {string} [dbName="chats.db"] - Name of the SQLite database file.
 * @param {string} userDataPath - Directory for the DB file, supplied by the Electron
 *   main process (`app.getPath('userData')`).
 * @returns {import("better-sqlite3").Database} An active `better-sqlite3` database instance.
 */
export function createDatabaseConnection(dbName = "chats.db", userDataPath) {
    if (!userDataPath) {
        throw new Error("userDataPath is required to resolve the database location.");
    }

    const dbPath = path.join(userDataPath, dbName);

    console.log(`Opening database: ${dbPath}`);

    const db = new Database(dbPath);

    // Enable SQLite foreign key constraint enforcement
    db.pragma("foreign_keys = ON");

    console.log("Database connected successfully.");

    return db;
}
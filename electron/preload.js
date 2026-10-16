const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload script exposing safe, context-isolated IPC bridge methods from Main to Renderer process.
 * Accessible in the renderer process via `window.api`.
 */
contextBridge.exposeInMainWorld("api", {
    /**
     * Opens native file picker dialog and executes ETL pipeline to import a WhatsApp chat export (.zip or .txt).
     * @returns {Promise<{ success: boolean, exist?: boolean, canceled?: boolean, error?: string, filePath?: string }>}
     */
    importChat: () => ipcRenderer.invoke("import-chat"),

    /**
     * Executes ETL pipeline to import a WhatsApp chat export under a new custom chat name.
     * Used when resolving name collisions during import.
     * @param {string} filePath - Absolute path to the export file on disk.
     * @param {string} customName - New overridden name for the imported chat session.
     * @returns {Promise<{ success: boolean, exist?: boolean, error?: string, filePath?: string }>}
     */
    importChatWithName: (filePath, customName) => ipcRenderer.invoke("import-chat-with-name", filePath, customName),

    /**
     * Fetches all imported chat sessions with their latest message details.
     * @returns {Promise<Array<Object>>} List of chat objects from SQLite database.
     */
    getChats: () => ipcRenderer.invoke("get-chats"),

    /**
     * Fetches the latest 100 messages for a specified chat ID.
     * @param {number|string} chatId - Target chat unique identifier.
     * @returns {Promise<Array<Object>>} Message records.
     */
    getMessages: (chatId) => ipcRenderer.invoke("get-messages", chatId),

    /**
     * Deletes a chat record and all associated messages from the database by ID.
     * @param {number|string} chatId - Target chat unique identifier.
     * @returns {Promise<{ chat: number }>} Count of affected records.
     */
    deleteChat: (chatId,chatName) => ipcRenderer.invoke("delete-chat", chatId,chatName),

    /**
     * Loads older messages prior to `cursorId` for cursor-based message pagination.
     * @param {number|string} chatId - Target chat unique identifier.
     * @param {number|string} cursorId - Message ID threshold.
     * @returns {Promise<Array<Object>>} Older message records.
     */
    loadMessages: (chatId, cursorId) => ipcRenderer.invoke("load-messages", chatId, cursorId),

    /**
     * Alias for `loadMessages` for API consistency across components.
     * @param {number|string} chatId - Target chat unique identifier.
     * @param {number|string} cursorId - Message ID threshold.
     * @returns {Promise<Array<Object>>} Older message records.
     */
    loadMoreMessages: (chatId, cursorId) => ipcRenderer.invoke("load-messages", chatId, cursorId),

    /**
     * Subscribes to import progress events emitted by the main process.
     * @param {Function} callback - Receives `{ phase, percent, current, total }`.
     * @returns {Function} Unsubscribe function that removes the listener.
     */
    onImportProgress: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on("import-progress", listener);
        return () => ipcRenderer.removeListener("import-progress", listener);
    },
});
const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload script exposing safe IPC bridge methods from Main to Renderer process.
 * Accessible in renderer context via `window.api`.
 */
contextBridge.exposeInMainWorld("api", {
    /**
     * Fetches all chats.
     * @returns {Promise<Array<Object>>}
     */
    getChats: () => ipcRenderer.invoke("get-chats"),

    /**
     * Fetches latest 100 messages for a chat.
     * @param {number|string} chatId
     * @returns {Promise<Array<Object>>}
     */
    getMessages: (chatId) => ipcRenderer.invoke("get-messages", chatId),

    /**
     * Deletes a chat by ID.
     * @param {number|string} chatId
     * @returns {Promise<{chat: number}>}
     */
    deleteChat: (chatId) => ipcRenderer.invoke("delete-chat", chatId),

    /**
     * Loads older messages prior to cursorId for message pagination.
     * @param {number|string} chatId
     * @param {number|string} cursorId
     * @returns {Promise<Array<Object>>}
     */
    loadMessages: (chatId, cursorId) => ipcRenderer.invoke("load-messages", chatId, cursorId),

    /**
     * Alias for loadMessages for API consistency.
     * @param {number|string} chatId
     * @param {number|string} cursorId
     * @returns {Promise<Array<Object>>}
     */
    loadMoreMessages: (chatId, cursorId) => ipcRenderer.invoke("load-messages", chatId, cursorId),
});
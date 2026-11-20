import { ipcMain, shell } from "electron";
import { deleteChatFiles } from "../../src/services/chatFileService.js";
import { resolveMediaPath } from "../../src/services/appPaths.js";

/**
 * Registers all chat-related IPC event handlers for main process communication.
 *
 * @param {import('../../src/services/chatService.js').chatServices} chatService - Instance of chatServices.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 */
export function registerChatHandlers(chatService, userDataPath) {
    /**
     * Handler for fetching all available chats.
     * IPC Channel: "get-chats"
     */
    ipcMain.handle("get-chats", () => {
        return chatService.getChats();
    });

    /**
     * Handler for fetching the latest messages for a specific chat.
     * IPC Channel: "get-messages"
     * @param {Object} event - IPC event.
     * @param {number|string} chatId - Target chat ID.
     */
    ipcMain.handle("get-messages", (_, chatId) => {
        return chatService.getMessages(chatId);
    });

    /**
     * Handler for deleting a chat session.
     * IPC Channel: "delete-chat"
     * @param {Object} event - IPC event.
     * @param {number|string} chat_id - Target chat ID.
     * @param {string} chatName - Target chat name for folder deletion.
     */
    ipcMain.handle("delete-chat", async (_, chat_id, chatName) => {
        await deleteChatFiles(chatName, userDataPath);
        return chatService.deleteChat(chat_id);
    });

    /**
     * Handler for loading older messages for cursor-based pagination.
     * IPC Channel: "load-messages"
     * @param {Object} event - IPC event.
     * @param {number|string} chat_id - Target chat ID.
     * @param {number|string} cursorId - Threshold message ID to fetch prior messages.
     */
    ipcMain.handle("load-messages", (_, chat_id, cursorId) => {
        return chatService.loadMessages(chat_id, cursorId);
    });

    /**
     * Handler for aggregate chat counters used by the chat info panel.
     * IPC Channel: "get-chat-stats"
     * @param {Object} _ - IPC event (unused).
     * @param {number|string} chatId - Target chat ID.
     */
    ipcMain.handle("get-chat-stats", (_, chatId) => {
        return chatService.getChatStats(chatId);
    });

    /**
     * Handler for all messages of one category (images, audio, documents, links).
     * IPC Channel: "get-category-messages"
     * @param {Object} _ - IPC event (unused).
     * @param {number|string} chatId - Target chat ID.
     * @param {string} categoryKey - Category to list.
     */
    ipcMain.handle("get-category-messages", (_, chatId, categoryKey) => {
        return chatService.getCategoryMessages(chatId, categoryKey);
    });

    /**
     * Opens a stored attachment with the OS default application.
     * IPC Channel: "open-attachment"
     * @param {Object} _ - IPC event (unused).
     * @param {string} storedPath - Path stored in `messages.message`.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    ipcMain.handle("open-attachment", async (_, storedPath) => {
        // Resolve through the imports root so the renderer cannot open arbitrary files.
        const absolutePath = resolveMediaPath(userDataPath, storedPath);
        if (!absolutePath) return { success: false, error: "Attachment path is not allowed." };

        // shell.openPath resolves to an empty string on success, an error message otherwise.
        const error = await shell.openPath(absolutePath);
        return error ? { success: false, error } : { success: true };
    });
}
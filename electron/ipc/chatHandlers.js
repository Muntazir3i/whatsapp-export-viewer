import { ipcMain } from "electron";

/**
 * Registers all chat-related IPC event handlers for main process communication.
 *
 * @param {import('../../src/services/chatService.js').chatServices} chatService - Instance of chatServices.
 */
export function registerChatHandlers(chatService) {
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
     */
    ipcMain.handle("delete-chat", (_, chat_id,chatName) => {
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
}
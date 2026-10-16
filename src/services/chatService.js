/**
 * @file chatService.js
 * Application-level operations for chats and messages. Thin coordination layer
 * over `chatRepository`; see that module for query and pagination semantics.
 */

export class chatServices {

    /**
     * @param {import('../db/chatRepository.js').chatRepository} chatRepository
     */
    constructor(chatRepository) {
        this.chatRepository = chatRepository;
    }

    /** @returns {Array<Object>} Chats with id, name, lastMessage, timestamp. */
    getChats() {
        return this.chatRepository.findAllChats();
    }

    /** @param {number|string} chatId */
    getChat(chatId) {
        return this.chatRepository.findChatById(chatId);
    }

    /** @param {number|string} chat_id */
    getMessages(chat_id) {
        return this.chatRepository.findMessagesByChatId(chat_id);
    }

    /** @param {number|string} chat_id */
    deleteChat(chat_id) {
        return this.chatRepository.deleteChat(chat_id);
    }

    /**
     * Cursor-based pagination: messages older than `cursorId`.
     * @param {number|string} chat_id
     * @param {number|string} cursorId
     */
    loadMessages(chat_id, cursorId) {
        return this.chatRepository.loadMoreMessages(chat_id, cursorId);
    }

    /** @param {string} chat_name */
    checkChat(chat_name) {
        return this.chatRepository.checkChatExist(chat_name);
    }

    /** @see loadMessages */
    loadMoreMessages(chat_id, cursorId) {
        return this.loadMessages(chat_id, cursorId);
    }
}

/**
 * @file chatService.js
 * Application-level operations for chats and messages. Thin coordination layer
 * over `chatRepository`; see that module for query and pagination semantics.
 */

import { buildMatchQuery } from "../parser/searchQuery.js";

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

    /**
     * In-chat full-text search. Parses the raw search box text into an FTS5
     * expression, so callers never pass unparsed input to `MATCH`.
     *
     * @param {number|string} chat_id
     * @param {string} rawQuery - Text as typed by the user.
     * @param {number|string} [limit] - Maximum results per page (1-100).
     * @param {number|string|null} [beforeId] - Cursor: only matches older than this ID.
     * @returns {{ results: Array<{ id: number, sender: string|null, timestamp: string, snippet: string }>, total: number|null }}
     */
    searchMessages(chat_id, rawQuery, limit = 50, beforeId = null) {
        const matchQuery = buildMatchQuery(rawQuery);
        if (!matchQuery) return { results: [], total: 0 };

        return {
            results: this.chatRepository.searchChatMessages(chat_id, matchQuery, limit, beforeId),
            // Counting every match is only needed for the first page; the client
            // keeps the total across "show more" requests.
            total: beforeId ? null : this.chatRepository.countChatMessages(chat_id, matchQuery),
        };
    }

    /**
     * Messages surrounding a search hit, centered on that message.
     *
     * @param {number|string} chat_id
     * @param {number|string} messageId
     * @param {number|string} [limit]
     * @returns {{ messages: Array<Object>, hasOlder: boolean, hasNewer: boolean }}
     */
    getMessageWindow(chat_id, messageId, limit = 100) {
        return this.chatRepository.findMessageWindow(chat_id, messageId, limit);
    }

    /**
     * Messages newer than the cursor, for continuing past a search jump.
     *
     * @param {number|string} chat_id
     * @param {number|string} cursorId
     * @returns {Array<Object>}
     */
    loadNewerMessages(chat_id, cursorId) {
        return this.chatRepository.loadNewerMessages(chat_id, cursorId);
    }

    /**
     * Aggregate counters for the chat info panel.
     * @param {number|string} chat_id
     */
    getChatStats(chat_id) {
        return this.chatRepository.getChatStats(chat_id);
    }

    /**
     * All messages of one category (`images`, `audio`, `documents`, `links`).
     * @param {number|string} chat_id
     * @param {string} categoryKey
     */
    getCategoryMessages(chat_id, categoryKey) {
        return this.chatRepository.getCategoryMessages(chat_id, categoryKey);
    }
}

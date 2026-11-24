/**
 * @file chatRepository.js
 * Database access for the `chats` and `messages` tables using prepared statements.
 * Query and pagination semantics are defined here; upper layers are thin pass-throughs.
 */

/**
 * Normalizes a caller-supplied row limit.
 *
 * @param {number|string|null|undefined} limit - Requested row count.
 * @param {number} fallback - Value used when the input is not a finite number.
 * @param {number} max - Inclusive upper bound.
 * @returns {number} Integer between 1 and `max`.
 */
function clampLimit(limit, fallback, max) {
    const requested = Number(limit ?? fallback);
    if (!Number.isFinite(requested)) return fallback;
    return Math.min(Math.max(Math.trunc(requested), 1), max);
}

export class chatRepository {
    /**
     * @param {import('better-sqlite3').Database} db
     */
    constructor(db) {
        this.db = db;

        // Every chat with its most recent message.
        this.findAllChatsStmt = this.db.prepare(`
            SELECT 
                c.id, 
                c.name, 
                c.participants,
                m.message AS lastMessage, 
                m.timestamp,
                m.type AS lastMessageType,
                m.category AS lastMessageCategory
            FROM chats c
            LEFT JOIN messages m 
                ON m.id = (
                    SELECT id 
                    FROM messages 
                    WHERE chat_id = c.id 
                    ORDER BY id DESC 
                    LIMIT 1
                )
        `);

        this.findChatByIdStmt = this.db.prepare(`
            SELECT 
                c.id, 
                c.name, 
                c.participants,
                m.message AS lastMessage, 
                m.timestamp,
                m.type AS lastMessageType,
                m.category AS lastMessageCategory
            FROM chats c
            LEFT JOIN messages m 
                ON m.id = (
                    SELECT id 
                    FROM messages 
                    WHERE chat_id = c.id 
                    ORDER BY id DESC 
                    LIMIT 1
                )
            WHERE c.id = ?
        `);

        // Newest 100 messages, re-sorted oldest-first for chronological display.
        this.findMessagesByChatIdStmt = this.db.prepare(`
            SELECT * FROM (
                SELECT * FROM messages 
                WHERE chat_id = ? 
                ORDER BY id DESC 
                LIMIT 100
            ) AS subquery
            ORDER BY id ASC;
        `);

        // Up to 100 messages older than the cursor, oldest-first.
        this.loadMoreMessagesStmt = this.db.prepare(`
            SELECT * FROM (
                SELECT * FROM messages 
                WHERE chat_id = ? AND id < ?
                ORDER BY id DESC 
                LIMIT 100
            ) AS subquery
            ORDER BY id ASC;
        `);

        // Up to 100 messages ending at a given id, oldest-first, for search jumps.
        this.messageWindowStmt = this.db.prepare(`
            SELECT * FROM (
                SELECT * FROM messages
                WHERE chat_id = ? AND id <= ?
                ORDER BY id DESC
                LIMIT ?
            ) AS subquery
            ORDER BY id ASC;
        `);

        // In-chat search: rank with bm25 and return highlighted snippets.
        this.searchChatMessagesStmt = this.db.prepare(`
            SELECT
                m.id,
                m.sender,
                m.timestamp,
                bm25(messages_fts) AS rank,
                snippet(messages_fts, 0, char(1), char(2), '…', 12) AS snippet
            FROM messages_fts
            JOIN messages m ON m.id = messages_fts.rowid
            WHERE messages_fts MATCH ?
                AND m.chat_id = ?
                AND m.type IN ('text', 'link')
            ORDER BY rank, m.id DESC
            LIMIT ?;
        `);

        this.checkChatExistStmt = this.db.prepare(`
            SELECT 1 
                FROM chats 
                WHERE name = ?
                LIMIT 1;
        `)

        this.deleteChatStmt = this.db.prepare('DELETE FROM chats WHERE id = ?');

        // Aggregate counters shown in the chat info panel.
        this.chatStatsStmt = this.db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN type = 'file' AND category = 'image' THEN 1 ELSE 0 END) AS images,
                SUM(CASE WHEN type = 'file' AND category = 'audio' THEN 1 ELSE 0 END) AS audio,
                SUM(CASE WHEN type = 'file' AND category = 'document' THEN 1 ELSE 0 END) AS documents,
                SUM(CASE WHEN type = 'link' THEN 1 ELSE 0 END) AS links
            FROM messages
            WHERE chat_id = ?
        `);

        const categoryQuery = (where) => this.db.prepare(`
            SELECT id, sender, message, timestamp, category, extension
            FROM messages
            WHERE chat_id = ? AND ${where}
            ORDER BY id ASC
        `);

        this.categoryStmts = {
            images: categoryQuery("type = 'file' AND category = 'image'"),
            audio: categoryQuery("type = 'file' AND category = 'audio'"),
            documents: categoryQuery("type = 'file' AND category = 'document'"),
            links: categoryQuery("type = 'link'"),
        };
    }

    /**
     * Aggregate message counters for a chat.
     * @param {number|string} chat_id
     * @returns {{ total: number, images: number, audio: number, documents: number, links: number }}
     */
    getChatStats(chat_id) {
        return this.chatStatsStmt.get(chat_id);
    }

    /**
     * All messages of one category (`images`, `audio`, `documents`, `links`), oldest-first.
     * @param {number|string} chat_id
     * @param {string} categoryStmt - Key of `categoryStmts`.
     * @returns {Array<Object>}
     */
    getCategoryMessages(chat_id, categoryKey) {
        const stmt = this.categoryStmts[categoryKey];
        return stmt ? stmt.all(chat_id) : [];
    }

    /** @returns {Array<Object>} All chats with their latest message. */
    findAllChats() {
        return this.findAllChatsStmt.all();
    }

    /** @param {number|string} id @returns {Object|undefined} */
    findChatById(id) {
        return this.findChatByIdStmt.get(id);
    }

    /** Latest 100 messages for a chat, oldest-first.
     *  @param {number|string} chat_id */
    findMessagesByChatId(chat_id) {
        return this.findMessagesByChatIdStmt.all(chat_id);
    }

    /** Up to 100 messages older than `cursorId`, oldest-first.
     *  @param {number|string} chat_id @param {number|string} cursorId */
    loadMoreMessages(chat_id, cursorId) {
        return this.loadMoreMessagesStmt.all(chat_id, cursorId);
    }

    /**
     * Up to `limit` messages ending at `messageId`, oldest-first. Used when jumping
     * to a search result so the target arrives with surrounding context.
     *
     * @param {number|string} chat_id
     * @param {number|string} messageId
     * @param {number|string} [limit]
     * @returns {Array<Object>}
     */
    findMessageWindow(chat_id, messageId, limit = 100) {
        return this.messageWindowStmt.all(
            chat_id,
            messageId,
            clampLimit(limit, 100, 200)
        );
    }

    /**
     * Searches one chat's text and link messages.
     *
     * @param {number|string} chatId
     * @param {string} matchQuery - FTS5 expression from `buildMatchQuery`.
     * @param {number|string} [limit] - Requested result count (1-100).
     * @returns {Array<{ id: number, sender: string|null, timestamp: string, rank: number, snippet: string }>}
     */
    searchChatMessages(chatId, matchQuery, limit = 50) {
        if (!chatId || !matchQuery) return [];
        return this.searchChatMessagesStmt.all(
            matchQuery,
            chatId,
            clampLimit(limit, 50, 100)
        );
    }

    /** @param {string} chat_name @returns {boolean} */
    checkChatExist(chat_name) {
        return !!this.checkChatExistStmt.get(chat_name);
    }

    /**
     * Deletes a chat. Associated messages are removed by the FK's
     * `ON DELETE CASCADE`.
     * @param {number|string} chat_id
     * @returns {{ chat: number }} Number of chats deleted.
     */
    deleteChat(chat_id) {
        const result = this.deleteChatStmt.run(chat_id);
        return { chat: result.changes };
    }

    /** @deprecated Use {@link deleteChat}. */
    deleteMessageById(chat_id) {
        return this.deleteChat(chat_id);
    }
}

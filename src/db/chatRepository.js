/**
 * @file chatRepository.js
 * Database access for the `chats` and `messages` tables using prepared statements.
 * Query and pagination semantics are defined here; upper layers are thin pass-throughs.
 */

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

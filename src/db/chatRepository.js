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
                m.timestamp 
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
                m.timestamp 
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

/**
 * @file chatRepository.js
 * @description
 * Encapsulates all database operations related to chats and messages.
 *
 * This repository is responsible for interacting with the SQLite database
 * using pre-compiled prepared statements and transactions. It provides methods
 * for retrieving chat and message data, paginating messages, and performing atomic deletions.
 */

/**
 * Repository class for executing database queries on the `chats` and `messages` tables.
 */
export class chatRepository {
    /**
     * Creates an instance of chatRepository and pre-compiles SQL prepared statements.
     * 
     * @param {import('better-sqlite3').Database} db - An active better-sqlite3 database connection object.
     */
    constructor(db) {
        this.db = db;

        // Pre-compile statements once for optimal performance
        this.findAllChatsStmt = this.db.prepare(`
            SELECT 
                c.id, 
                c.name, 
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

        this.findMessagesByChatIdStmt = this.db.prepare(`
            SELECT * FROM (
                SELECT * FROM messages 
                WHERE chat_id = ? 
                ORDER BY id DESC 
                LIMIT 100
            ) AS subquery
            ORDER BY id ASC;
        `);

        // Pre-compile statement for cursor-based message pagination (fetches up to 100 messages older than cursorId)
        this.loadMoreMessagesStmt = this.db.prepare(`
            SELECT * FROM (
                SELECT * FROM messages 
                WHERE chat_id = ? AND id < ?
                ORDER BY id DESC 
                LIMIT 100
            ) AS subquery
            ORDER BY id ASC;
        `);

        // Pre-compile statement to check if the chat exist for not

        this.checkChatExistStmt = this.db.prepare(`
            SELECT 1 
                FROM chats 
                WHERE name = ?
                LIMIT 1;
        `)

        // Pre-compile statement for deleting a chat (cascading deletes associated messages)
        this.deleteChatStmt = this.db.prepare('DELETE FROM chats WHERE id = ?');
    }

    /**
     * Retrieves all chats from the database along with their most recent message details.
     *
     * @returns {Array<Object>} An array of objects representing all chats (id, name, lastMessage, timestamp).
     */
    findAllChats() {
        return this.findAllChatsStmt.all();
    }

    /**
     * Retrieves a single chat record by its unique ID along with its latest message.
     *
     * @param {number|string} id - The unique identifier of the chat to find.
     * @returns {Object|undefined} The chat record matching the ID, or `undefined` if not found.
     */
    findChatById(id) {
        return this.findChatByIdStmt.get(id);
    }

    /**
     * Retrieves the latest 100 messages for a specified chat ID.
     *
     * @param {number|string} chat_id - The ID of the chat whose messages are being requested.
     * @returns {Array<Object>} An array containing up to 100 of the most recent message records for the chat.
     */
    findMessagesByChatId(chat_id) {
        return this.findMessagesByChatIdStmt.all(chat_id);
    }

    /**
     * Retrieves up to 100 older messages for a specified chat ID before the given cursor ID.
     *
     * @param {number|string} chat_id - The ID of the chat whose messages are being requested.
     * @param {number|string} cursorId - The message ID threshold (messages with id < cursorId will be fetched).
     * @returns {Array<Object>} An array containing older message records for the chat ordered chronologically (id ASC).
     */
    loadMoreMessages(chat_id, cursorId) {
        return this.loadMoreMessagesStmt.all(chat_id, cursorId);
    }

    /**
     * Deletes a chat record from the database by ID.
     * 
     * Foreign key `ON DELETE CASCADE` automatically deletes all associated messages.
     *
     * @param {number|string} chat_id - The ID of the chat to delete.
     * @returns {{ chat: number }} Object containing the count of affected deleted chat records.
     */
    deleteChat(chat_id) {
        const result = this.deleteChatStmt.run(chat_id);
        return { chat: result.changes };
    }

    checkChatExist(chat_name){
        return this.checkChatExistStmt.get(chat_name)
    }

    /**
     * Alias for `deleteChat` to maintain backward compatibility.
     *
     * @param {number|string} chat_id - The ID of the chat to delete.
     * @returns {{ chat: number }} Object containing the count of affected deleted chat records.
     */
    deleteMessageById(chat_id) {
        return this.deleteChat(chat_id);
    }
}
/**
 * @file schema.js
 * @description Defines database schema DDL and provides a ChatRepository class for data access and transactional batch insertions.
 */

/**
 * Creates the application schema if it does not already exist:
 *  - `chats` and `messages` tables
 *  - `messages_fts` FTS5 index over message text (external content)
 *  - triggers that keep `messages_fts` synchronized with `messages`
 *  - a supporting `(chat_id, id)` index for message pagination
 *
 * Intended to run on every app start; all DDL is idempotent.
 *
 * @param {import("better-sqlite3").Database} db - SQLite database instance.
 */
export function createSchema(db) {
    db.exec(
        `
        CREATE TABLE IF NOT EXISTS chats(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            file_name TEXT,
            participants TEXT NOT NULL DEFAULT '[]',
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            sender TEXT,
            message TEXT,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            extension TEXT,
            category TEXT,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        message,
        content = 'messages',
        content_rowid = 'id',
        tokenize = 'unicode61 remove_diacritics 2'
        );

        CREATE TRIGGER IF NOT EXISTS message_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, message)
            VALUES (new.id, new.message);
        END;

        CREATE TRIGGER IF NOT EXISTS message_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, message)
            VALUES ('delete', old.id, old.message);
        END;

        CREATE TRIGGER IF NOT EXISTS message_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, message)
            VALUES ('delete', old.id, old.message);

            INSERT INTO messages_fts(rowid, message)
            VALUES (new.id, new.message);
        END;

        CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id
        ON messages(chat_id, id);

        `
    );
}

/**
 * Repository encapsulating database operations for chats and messages.
 */
export class ChatRepository {
    /**
     * Constructs a ChatRepository instance and prepares SQL statements.
     * 
     * @param {import("better-sqlite3").Database} db - Active SQLite database instance.
     */
    constructor(db) {
        this.db = db;

        // Pre-compile SQL insert statements for optimal performance
        this.insertChatStmt = this.db.prepare(`
            INSERT INTO chats (name, file_name)
            VALUES (@name, @file_name)
            RETURNING *
        `);

        this.insertMessageStmt = this.db.prepare(`
            INSERT INTO messages (chat_id, sender, message, timestamp, type, extension, category)
            VALUES (@chat_id, @sender, @message, @timestamp, @type, @extension, @category)
        `);

        // Pre-compile statement for updating participants and returning the row
        this.updateParticipantsStmt = this.db.prepare(`
            UPDATE chats 
            SET participants = @participants 
            WHERE id = @id
            RETURNING *
        `);

        // Pre-compile bulk batch insert transaction wrapper
        this.batchTransaction = this.db.transaction((messages) => {
            for (const msg of messages) {
                this.insertMessageStmt.run({
                    chat_id: msg.chat_id,
                    sender: msg.sender,
                    message: msg.message,
                    timestamp: msg.timestamp,
                    type: msg.type,
                    extension:msg.extension,
                    category:msg.category,
                });
            }
        });
    }

    /**
     * Inserts a new chat metadata record.
     * 
     * @param {Object} chatData - Chat metadata object containing `name` and `file_name`.
     * @returns {Object} The inserted database row object including `id`.
     */
    createChat(chatData) {
        const insertedRow = this.insertChatStmt.get({
            name: chatData.name,
            file_name: chatData.file_name
        });
        return insertedRow;
    }

    /**
     * Inserts a single message row.
     * @param {Object} messageData - Row with chat_id, sender, message, timestamp, type, extension, category.
     */
    insertMessage(messageData) {
        this.insertMessageStmt.run({
            chat_id: messageData.chat_id,
            sender: messageData.sender,
            message: messageData.message,
            timestamp: messageData.timestamp,
            type: messageData.type,
            extension:messageData.extension,
            category:messageData.category,
        });
    }

    /**
     * Inserts an array of messages within a single SQLite transaction.
     * 
     * @param {Array<Object>} messages - Array of message objects to insert in bulk.
     */
    insertBatch(messages) {
        this.batchTransaction(messages);
    }

    // Method to save participants and return the updated chat record
    updateParticipants(chatId, participantsSet) {
        participantsSet.delete(null)
        const participantsArray = [...participantsSet];
        const participantsJson = JSON.stringify(participantsArray);

        return this.updateParticipantsStmt.get({
            id: chatId,
            participants: participantsJson
        });
    }
}
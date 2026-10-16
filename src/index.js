/**
 * @file index.js
 * @description Main entry point and composition root for the WhatsApp Export ETL Pipeline.
 * Orchestrates file resolution, ZIP extraction, metadata extraction, duplication checks,
 * streaming text parsing, and transaction-batched SQLite database insertions.
 */

import { ChatRepository } from "./db/schema.js";
import { extractChatMetadata, streamChatMessages } from "./parser/importer.js";
import { chatRepository as ChatQueryRepository } from "./db/chatRepository.js";
import { grabFileLocation, extractZip, findChatFile } from "./services/importChat.js";

/** Number of parsed messages to accumulate before performing a bulk transactional database insert. */
const BATCH_SIZE = 1000;

/**
 * Main ETL pipeline orchestrator for importing WhatsApp chat exports into SQLite.
 *
 * @param {string} fileName - Absolute or relative path to the target .zip or .txt export file.
 * @param {import("better-sqlite3").Database} db - Active SQLite database instance.
 * @param {string} [customName] - Optional custom name override provided by the user.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 * @returns {Promise<boolean>} Resolves to `true` if a chat with the same name already exists (collision detected), or `false` on successful import.
 */
export async function main(fileName, db, customName, userDataPath) {
    // 1. Resolve file path, target import directory, and format type (.zip vs .txt)
    const { filePath, importDir, isZip } = await grabFileLocation(fileName, customName, userDataPath);

    // 2. Initialize repository instances for database writes and existence queries
    const repository = new ChatRepository(db);
    const queryRepository = new ChatQueryRepository(db);

    // 3. Extract initial chat session metadata (e.g., chat name derived from filename)
    let chatFilePath = filePath;
    const chatMetadata = extractChatMetadata(chatFilePath);

    // 4. Apply custom name override if specified, or check for existing chat name collision
    if (customName) {
        chatMetadata.name = customName;
    } else {
        const alreadyExists = queryRepository.checkChatExist(chatMetadata.name);
        if (alreadyExists) {
            // Return true to notify caller that chat already exists in database
            return true;
        }
    }

    // 5. Execute ETL Import Pipeline (ZIP extraction, parsing, and transactional batch loading)
    await runImportPipeline({
        filePath,
        importDir,
        isZip,
        chatFilePath,
        chatMetadata,
        repository
    });

    return false;
}

/**
 * Executes the core ETL process: extracts ZIP archives, streams parsed message data,
 * and performs chunked batch insertions into the database.
 *
 * @param {Object} options - Pipeline configuration and dependency object.
 * @param {string} options.filePath - Path to the original export file.
 * @param {string} options.importDir - Target extraction directory for ZIP archives.
 * @param {boolean} options.isZip - True if source file is a compressed ZIP archive.
 * @param {string} options.chatFilePath - Resolved path to the text chat file.
 * @param {Object} options.chatMetadata - Extracted chat metadata object.
 * @param {ChatRepository} options.repository - Database writing repository instance.
 * @returns {Promise<void>}
 */
async function runImportPipeline({
    filePath,
    importDir,
    isZip,
    chatFilePath,
    chatMetadata,
    repository
}) {
    // Extract ZIP archive if applicable
    if (isZip) {
        await extractZip(filePath, importDir);
        // Locate the target .txt chat file inside the uncompressed folder
        chatFilePath = await findChatFile(importDir);
    }

    // Insert new chat metadata record into database
    const chatRecord = repository.createChat(chatMetadata);
    const chatId = chatRecord.id;

    // Buffer for accumulative batch insertions
    let messageBuffer = [];
    let participants = new Set([]);

    // Stream and parse messages line-by-line to minimize memory footprint
    await streamChatMessages(
        chatFilePath,
        async (parsedMessage) => {
            messageBuffer.push({
                chat_id: chatId,
                ...parsedMessage
            });

            for (const msg of messageBuffer) {
                participants.add(msg.sender)
            }

            // Flush buffer when batch limit is reached
            if (messageBuffer.length >= BATCH_SIZE) {
                repository.insertBatch(messageBuffer);
                messageBuffer = [];
            }
        }
    );

    // Flush remaining messages left in the buffer tail
    if (messageBuffer.length > 0) {
        repository.insertBatch(messageBuffer);
    }

    repository.updateParticipants(chatId, participants);
}

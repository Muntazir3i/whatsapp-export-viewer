/**
 * @file index.js
 * @description Composition Root for the WhatsApp Export Parser application.
 * Instantiates components and orchestrates the ETL pipeline (Extract, Transform, Load).
 */

import { ChatRepository } from "./db/schema.js";
import { extractChatMetadata, streamChatMessages, ConsoleProgressReporter } from "./parser/importer.js";
import { chatRepository } from "./db/chatRepository.js";
import { grabFileLocation, extractZip, findChatFile } from "./services/importChat.js";

const BATCH_SIZE = 1000;

export async function main(fileName, db, customName) {
    // 1. Initialize Console UI Progress Reporter
    const progressReporter = new ConsoleProgressReporter();

    // 2. Resolve Export File Location (ZIP or TXT)
    const { filePath, importDir, isZip } = await grabFileLocation(fileName);

    let chatFilePath = filePath;

    // // 4. Initialize Data Repository
    const repository = new ChatRepository(db);

    // 4. Initialize DataBase Operation Repository
    const dbOperationRespository = new chatRepository(db)

    // 5. Register Chat Session Metadata
    const chatMetadata = extractChatMetadata(chatFilePath);

    const exist = dbOperationRespository.checkChatExist(chatMetadata.name)


    if (customName) {
        chatMetadata.name = customName

        if (isZip) {
            progressReporter.updateZip(0, 1);
            await extractZip(filePath, importDir, (current, total) => {
                progressReporter.updateZip(current, total);
            });
            progressReporter.completeZip();
            chatFilePath = await findChatFile(importDir);
        }

        const chatRecord = repository.createChat(chatMetadata);
        const chatId = chatRecord.id;

        // 6. Stream and Batch Message Insertions
        let messageBuffer = [];

        await streamChatMessages(
            chatFilePath,
            async (parsedMessage) => {
                messageBuffer.push({
                    chat_id: chatId,
                    ...parsedMessage
                });

                if (messageBuffer.length >= BATCH_SIZE) {
                    repository.insertBatch(messageBuffer);
                    messageBuffer = [];
                }
            },
            (bytesRead, totalBytes) => {
                progressReporter.update(bytesRead, totalBytes);
            }
        );

        // 7. Flush Remaining Buffer Tail & Complete
        if (messageBuffer.length > 0) {
            repository.insertBatch(messageBuffer);
        }

        progressReporter.complete();
        return false;
    }



    if (exist) {
        return exist
    } else {

        if (isZip) {
            progressReporter.updateZip(0, 1);
            await extractZip(filePath, importDir, (current, total) => {
                progressReporter.updateZip(current, total);
            });
            progressReporter.completeZip();
            chatFilePath = await findChatFile(importDir);
        }

        const chatRecord = repository.createChat(chatMetadata);
        const chatId = chatRecord.id;

        // 6. Stream and Batch Message Insertions
        let messageBuffer = [];

        await streamChatMessages(
            chatFilePath,
            async (parsedMessage) => {
                messageBuffer.push({
                    chat_id: chatId,
                    ...parsedMessage
                });

                if (messageBuffer.length >= BATCH_SIZE) {
                    repository.insertBatch(messageBuffer);
                    messageBuffer = [];
                }
            },
            (bytesRead, totalBytes) => {
                progressReporter.update(bytesRead, totalBytes);
            }
        );

        // 7. Flush Remaining Buffer Tail & Complete
        if (messageBuffer.length > 0) {
            repository.insertBatch(messageBuffer);
        }

        progressReporter.complete();
    }






}



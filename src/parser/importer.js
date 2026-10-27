/**
 * @file importer.js
 * @description High-level stream importer for reading WhatsApp export files and invoking callbacks for parsed messages.
 */

import { createLineReader, getFileByteSize } from "./reader.js";
import { MessageStreamBuffer } from "./messageParser.js";

import path from "path";

/**
 * Extracts the relative file name and contact name from the file path.
 *
 * @param {string} filePath - Target chat export file path string.
 * @returns {[string, string]} Array containing `[fileName, contactName]`.
 */
export function extractChatFileInfo(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);
    const baseNameWithoutExt = path.basename(fileName, ext);

    const withMatch = baseNameWithoutExt.match(/with\s+(.+)$/i);
    const contactName = withMatch ? withMatch[1].trim() : baseNameWithoutExt.trim();

    return [fileName, contactName];
}

/**
 * Prepares chat metadata (chat name and file name) from a target export path.
 *
 * @param {string} filePath - Path to the chat export file.
 * @returns {{ name: string, file_name: string }} Chat metadata object.
 */
export function extractChatMetadata(filePath) {
    let [fileName, contactName] = extractChatFileInfo(filePath);
    return { name: contactName, file_name: fileName };
}

/**
 * Streams messages line-by-line from a text file and invokes a callback for each parsed message.
 *
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 * @param {string} filePath - Path to the WhatsApp export `.txt` file.
 * @param {Function} onMessageParsed - Async callback `(messageObj) => Promise<void>` when a message is ready.
 * @param {Function} [onProgress] - Optional callback `(bytesRead, totalBytes) => void`.
 */
export async function streamChatMessages(userDataPath, filePath, onMessageParsed, onProgress) {
    const lineReader = createLineReader(filePath);
    const totalBytes = getFileByteSize(filePath);
    let bytesRead = 0;

    // Media files are extracted next to the chat .txt file, which may live in a
    // nested folder rather than directly under the imports directory.
    const mediaDir = path.dirname(filePath);

    const messageBuffer = new MessageStreamBuffer();

    for await (const line of lineReader) {
        // readline strips the newline, so +1 accounts for it in the byte total
        bytesRead += Buffer.byteLength(line) + 1;
        if (onProgress) {
            onProgress(bytesRead, totalBytes);
        }

        if (line.length === 0) continue;

        const parsedMessage = messageBuffer.processLine(line, mediaDir, userDataPath);
        if (parsedMessage) {
            await onMessageParsed(parsedMessage);
        }
    }

    // Flush final trailing message at end of stream
    const finalMessage = messageBuffer.flush(mediaDir, userDataPath);
    if (finalMessage) {
        await onMessageParsed(finalMessage);
    }
}

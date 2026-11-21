/**
 * @file importer.js
 * @description High-level stream importer for reading WhatsApp export files and invoking callbacks for parsed messages.
 */

import { createLineReader, getFileByteSize } from "./reader.js";
import { MessageStreamBuffer } from "./messageParser.js";

import fs from "node:fs";
import readline from "node:readline";
import path from "path";

/**
 * Filename patterns WhatsApp uses for exported chats.
 *   Android -> "WhatsApp Chat with Aatif"
 *   iOS     -> "WhatsApp Chat - Anna"
 */
const CHAT_NAME_PATTERNS = [
    /^WhatsApp Chat with\s+(.+)$/i,
    /^WhatsApp Chat\s*-\s*(.+)$/i,
];

/**
 * Returns the contact name encoded in a filename, or null when the name does
 * not follow a known WhatsApp export pattern.
 *
 * @param {string} candidate - Filename without extension, or parent folder name.
 * @returns {string|null} Extracted chat name.
 */
function matchChatName(candidate) {
    for (const pattern of CHAT_NAME_PATTERNS) {
        const match = candidate.match(pattern);
        if (match) return match[1].trim();
    }
    return null;
}

/**
 * Extracts the relative file name and contact name from the file path.
 *
 * @param {string} filePath - Target chat export file path string.
 * @returns {[string, string, boolean]} `[fileName, contactName, isGenericName]`.
 *   `isGenericName` is true when neither the filename nor its folder identified
 *   the chat (for example iOS `_chat.txt` in a generic downloads folder).
 */
export function extractChatFileInfo(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);
    const baseNameWithoutExt = path.basename(fileName, ext);

    // iOS always names the text file "_chat.txt", which carries no contact name.
    // If the user picks that file out of an extracted folder, the folder is often
    // still named after the original export ("WhatsApp Chat - Anna"). Only use it
    // when it actually looks like a WhatsApp export name.
    const candidates = [
        baseNameWithoutExt,
        path.basename(path.dirname(path.resolve(filePath))),
    ];

    for (const candidate of candidates) {
        const contactName = matchChatName(candidate);
        if (contactName) return [fileName, contactName, false];
    }

    return [fileName, baseNameWithoutExt.trim() || "Chat", true];
}

/**
 * Returns true when the export file does not identify the chat, so the user
 * should be asked for a name before importing.
 *
 * @param {string} filePath - Path to the selected `.zip` or `.txt` export.
 * @returns {boolean}
 */
export function needsChatName(filePath) {
    const [, , isGenericName] = extractChatFileInfo(filePath);
    return isGenericName;
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
 * Classifies the export flavor from one representative line of the chat file.
 *
 * Detection is content-based rather than filename-based: Android and iOS have both
 * shipped "WhatsApp Chat with X" and "WhatsApp Chat - X" names, files get renamed,
 * and the name says nothing about the timestamp syntax that actually matters here.
 * The delimiter is the dependable signal:
 *   Android -> "12/05/24, 10:16 - ..."     (timestamp ends at " - ")
 *   iOS     -> "[25/04/22, 7:36:20 PM] ..." (timestamp is bracketed)
 *
 * @param {string} firstLine - First line of the export file.
 * @returns {"android"|"ios"|null} Detected flavor, or null when neither format matched.
 */
function findFlavor(firstLine) {
  // iOS wraps its timestamp in square brackets, and that bracket is the most
  // reliable signal. Checking " - " first would misread an iOS first line whose
  // body contains " - " (for example a group notice) as Android.
  if (/^[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF\s]*\[\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},/.test(firstLine)) {
    return "ios"
  } else if (firstLine.includes(" - ")) {
    return "android"
  } else {
    return null
  }
}

/**
 * Determines the export format by reading only the first line of the chat file.
 *
 * The stream is closed immediately after that first line: the file is opened
 * again by `streamChatMessages`, so there is no reason to keep it buffered or hold
 * the descriptor while the import continues.
 *
 * @param {string} filePath - Path to the resolved chat `.txt` file.
 * @returns {Promise<"android"|"ios"|null>} Detected flavor; a falsy value means the
 *   file was empty or the first line matched neither known format.
 */
export async function detectFlavor(filePath) {
  const fileStream = fs.createReadStream(filePath);
   const rl = readline.createInterface({
     input: fileStream,
     crlfDelay: Infinity
   });
 
   for await (const line of rl) {
     // Skip blank/BOM-only leading lines; exports occasionally start with one.
     if (line.trim() === "") continue;
     // First real line is all we need; release the fd before the streaming pass
     // reopens it.
     rl.close();
     fileStream.destroy();
     return findFlavor(line)
   }

   // Empty file: no representative line, so the flavor is unknown.
   return null;
}

/**
 * Streams messages line-by-line from a text file and invokes a callback for each parsed message.
 *
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 * @param {string} filePath - Path to the WhatsApp export `.txt` file.
 * @param {"android"|"ios"} flavor - Export format resolved once by `detectFlavor`; passed on to
 *   the message buffer so each line is matched against the correct timestamp format.
 * @param {Function} onMessageParsed - Async callback `(messageObj) => Promise<void>` when a message is ready.
 * @param {Function} [onProgress] - Optional callback `(bytesRead, totalBytes) => void`.
 */
export async function streamChatMessages(userDataPath, filePath, flavor, onMessageParsed, onProgress) {
    const lineReader = createLineReader(filePath);
    const totalBytes = getFileByteSize(filePath);
    let bytesRead = 0;

    // Media files are extracted next to the chat .txt file, which may live in a
    // nested folder rather than directly under the imports directory.
    const mediaDir = path.dirname(filePath);

    // Flavor is fixed for the whole import, so it is captured once here and
    // reused for every line by the buffer.
    const messageBuffer = new MessageStreamBuffer(flavor);

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

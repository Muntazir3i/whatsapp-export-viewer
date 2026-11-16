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
 * Extracts the relative file name and contact name from the file path.
 *
 * @param {string} filePath - Target chat export file path string.
 * @returns {[string, string]} Array containing `[fileName, contactName]`.
 */
export function extractChatFileInfo(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);
    const baseNameWithoutExt = path.basename(fileName, ext);
    const withMatch = baseNameWithoutExt.match(/^WhatsApp Chat with\s+(.+)$/i);
    const dashMatch = baseNameWithoutExt.match(/^WhatsApp Chat\s*-\s*(.+)$/i);
    const contactName = (withMatch?.[1] ?? dashMatch?.[1] ?? baseNameWithoutExt).trim();
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
  // Android is checked first so its delimiter wins on lines that carry both
  // signals. Note this keys off " - " anywhere in the line, so an iOS first line
  // whose body contains " - " would be misread as Android; the first line of an
  // export is normally a timestamped message or system banner, so this is safe
  // enough in practice.
  let indexOfDash = firstLine.indexOf(" - ");
  let indexOfColon = firstLine.indexOf("]");

  if (indexOfDash > -1) {
    return "android"
  } else if (indexOfColon > -1) {
    return "ios"
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
     // First line is all we need; release the fd before the streaming pass reopens it.
     rl.close();
     fileStream.destroy();
     return findFlavor(line)
   }
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

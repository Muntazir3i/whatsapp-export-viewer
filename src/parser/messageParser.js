import path from "node:path";
import { extensionToCategory } from "../utils/fileTypes.js";
import { toStoredMediaPath } from "../services/appPaths.js";

/**
 * @file messageParser.js
 * @description Logic for identifying message start lines, parsing WhatsApp export line formats, and building structured message objects.
 */

/**
 * Checks whether a line starts a new message, based on its timestamp prefix.
 *
 * The check is format-specific because Android and iOS delimit the timestamp
 * differently:
 *   Android: "12/05/24, 10:16 - Sender: Message"
 *   iOS:     "[25/04/22, 7:36:20 PM] Sender: Message"
 *
 * Only the timestamp prefix is validated here; the sender and message body are
 * extracted later by `parseMessageText`. Any line that fails this check is a
 * continuation line and gets appended to the message being buffered.
 *
 * @param {string} lineText - The line text to evaluate.
 * @param {"android"|"ios"} flavor - Export format resolved once per import by `detectFlavor`.
 * @returns {boolean|null} True if the line begins with a valid date prefix, false for
 *   continuation lines, or null when the flavor is unknown.
 */
export function isMessageStartLine(lineText,flavor) {
  if (flavor === "android") {
    // Android carries the timestamp before the first " - ".
    const [timestampStr] = lineText.split(" - ");
    const [dateString] = timestampStr.split(", ")
    let [day, month, year] = dateString.split("/");
    let fullYear = "20" + year;
    let dateObj = new Date(fullYear, month - 1, day);
    return !Number.isNaN(dateObj.getDate());
  } else if (flavor === "ios") {
    // iOS wraps the timestamp in square brackets. Only the text before the
    // closing bracket is the timestamp; the message body may contain more.
    const [RawTimeStampStr] = lineText.split("]")
    // Strip the opening bracket and any leading zero-width/bidi marks. iOS
    // prefixes phone-number senders and attachment lines with U+200E, which
    // would otherwise sit inside the day token and make the date invalid.
    const timeStampStr = RawTimeStampStr.replaceAll("[", "").replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "").trim();
    const [dateString, timeString] = timeStampStr.split(",")
    // Continuation lines have no comma, so `timeString` is undefined; guard both
    // parts instead of assuming a complete timestamp is present.
    const trimmedDate = (dateString ?? "").trim()
    const trimmedTime = (timeString ?? "").trim()
    let [day, month, year] = trimmedDate.split("/")
    let fullYear = "20" + year;
    let dateObj = new Date(fullYear, month - 1, day);
    return !Number.isNaN(dateObj.getDate());
  } else {
    // Unknown flavor: every line looks like a continuation, so the export would
    // collapse into one buffered message. Detection runs before streaming to
    // make sure this branch is never reached in practice.
    return null
  }
}

/**
 * Parses a raw message string into `{ sender, message, timestamp }`.
 *
 *   Android: "12/05/24, 10:16 - Sender: Message"
 *   iOS:     "[25/04/22, 7:36:20 PM] Sender: Message"
 *
 * A line with no "Sender: " prefix is a system notice, so `sender` is null.
 *
 * @param {string} rawMessageText - Start line plus any "\n"-joined continuation lines.
 * @param {"android"|"ios"} flavor - Export format from `detectFlavor`.
 * @returns {{sender: string|null, message: string, timestamp: string}}
 */
export function parseMessageText(rawMessageText, flavor) {
  if (flavor === "android") {
    // Timestamp ends at the first " - ".
    let indexOfDash = rawMessageText.indexOf(" - ");
    const timestampStr = rawMessageText.slice(0, indexOfDash);
    const rest = rawMessageText.slice(indexOfDash + 3)


    if (rest.includes(": ")) {
        const [sender, ...msgParts] = rest.split(": ");
        const messageContent = msgParts.join(": ");
        const [dateStr, timeStr] = timestampStr.split(", ");

        return {
            sender: sender,
            message: messageContent,
            timestamp: `${dateStr} ${timeStr}`
        };
    } else {
        const [dateStr, timeStr] = timestampStr.split(", ");
        return {
            sender: null,
            message: rest,
            timestamp: `${dateStr} ${timeStr}`
        }
    }
  } else if (flavor === "ios") {
    // Timestamp sits between "[" and "]"; strip leading bidi/BOM marks first.
    const line = rawMessageText.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
    const bracketIndex = line.indexOf("]");
    // slice(1, ...) drops "[", the end index excludes "]".
    const timestampStr = line.slice(1, bracketIndex);
    // trimStart handles a missing or doubled space after "]".
    const rest = line.slice(bracketIndex + 1).trimStart();

    if (rest.includes(": ")) {
        // Split on the first ": " so colons in the body stay intact.
        const [sender, ...msgParts] = rest.split(": ");
      // Strip the invisible marks iOS adds before numbers and attachments.
      const rawMessageContent = msgParts.join(": ");
      const messageContent = rawMessageContent.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
      const [rawDateStr, rawTimeStr] = timestampStr.split(", ");
      const dateStr = rawDateStr.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
      const timeStr = rawTimeStr.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");

        return {
            sender: sender,
            message: messageContent,
            timestamp: `${dateStr} ${timeStr}`
        };
    } else {
        const [dateStr, timeStr] = timestampStr.split(", ");
        return {
            sender: null,
            message: rest,
            timestamp: `${dateStr} ${timeStr}`
        }
    }
  }
}

/** Matches URLs WhatsApp auto-links: http(s):// or a bare www. host. */
const LINK_PATTERN = /(?:https?:\/\/|www\.)\S+/i;

/**
 * Adds a `type` (and media metadata) to a parsed message.
 *
 * Types: "system" (no sender), "media", "deleted", "file" (attachment), "link", "text".
 * Only "file" gets `extension`/`category`; the others get null. For a file, the
 * stored media path replaces `message`.
 *
 * @param {{sender: string|null, message: string, timestamp: string}} msgObj - Parsed message.
 * @param {string} mediaDir - Directory holding the chat file and its media files.
 * @param {string} userDataPath - OS userData directory from the Electron main process.
 * @param {"android"|"ios"} flavor - Export format, used for iOS-only markers.
 * @returns {Object} The message with `type`, `extension`, and `category` added.
 */
export function classifyMessage(msgObj, mediaDir, userDataPath, flavor) {
    if (msgObj.sender === null) {
        // No sender means a system notice in both formats.
        return { ...msgObj, type: "system", extension: null, category: null }
    }

    if (msgObj.message === "<Media omitted>") {
        // Placeholder for media not included in the export.
        return { ...msgObj, type: "media", extension: null, category: null }
    }

    if (msgObj.message === "You deleted this message" || msgObj.message === "This message was deleted") {
        // Both phrasings appear across formats and locales.
        return { ...msgObj, type: "deleted", extension: null, category: null }
    }

    if (msgObj.message.endsWith("(file attached)")) {
        // Attachment line: "<filename> (file attached)".
        const fileName = msgObj.message.slice(0, msgObj.message.indexOf("(file attached)")).trim();

        // A dotted suffix after at least one character is the extension.
        const dotIndex = fileName.lastIndexOf(".");
        const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : null;
        const category = extension ? extensionToCategory[extension] ?? null : null;

        // Media sits next to the chat .txt, which may be a nested folder.
        const absoluteMediaPath = path.join(mediaDir, fileName);

        return {
            ...msgObj,
            message: toStoredMediaPath(userDataPath, absoluteMediaPath),
            extension,
            category,
            type: "file"
        }
    }

    // iOS markers run before the link check: an edited message that contains a URL
    // must still have the marker stripped, and "<attached: ...>" is a file.
    if (flavor === "ios") {
        // iOS hides a bidi mark (U+200E) right before the edited marker. trim() keeps it
        // because it is not whitespace, so strip it first.
        if (msgObj.message.endsWith("<This message was edited>")) {
            const msg = msgObj.message.replace("<This message was edited>", "");
            return { ...msgObj, message: msg, type: "text", extension: null, category: null }
        } else if (msgObj.message.startsWith("<attached") && msgObj.message.endsWith(">")) {
            let [withAttached, fileName] = msgObj.message.split(": ")
            let result = fileName.replaceAll(">", "")

            const dotIndex = result.lastIndexOf(".");
            const extension = dotIndex > 0 ? result.slice(dotIndex).toLowerCase() : null;
            const category = extension ? extensionToCategory[extension] ?? null : null;
            const absoluteMediaPath = path.join(mediaDir, result);
            return {
                ...msgObj,
                message: toStoredMediaPath(userDataPath, absoluteMediaPath),
                extension,
                category,
                type: "file"
            }
        }
    }

    if (LINK_PATTERN.test(msgObj.message)) {
        // Renderer turns URLs inside the message into external links.
        return { ...msgObj, type: "link", extension: null, category: null }
    }

    // Plain text message.
    return { ...msgObj, type: "text", extension: null, category: null }
}


/**
 * Encapsulates multi-line message buffering and line parsing state.
 *
 * An export stores each message as a start line followed by zero or more
 * continuation lines, so the current message is held in `buffer` until the next
 * start line (or end of stream) marks it complete.
 */
export class MessageStreamBuffer {
    /**
     * @param {"android"|"ios"} flavor - Export format; selects the line matcher and
     *   timestamp parser used for every line pushed through this buffer.
     */
    constructor(flavor) {
        this.buffer = "";
        this.flavor = flavor;
    }

    /**
     * Processes a single line read from the export stream.
     * 
     * @param {string} line - Current line from the chat file.
     * @param {string} mediaDir - Directory containing the chat file and its media attachments.
     * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
     * @returns {Object|null} Parsed message object if a message boundary was completed, or null if accumulating.
     */
    processLine(line, mediaDir, userDataPath) {
        if (isMessageStartLine(line, this.flavor)) {
            let completedMsg = null;
            if (this.buffer !== "") {
                completedMsg = classifyMessage(parseMessageText(this.buffer, this.flavor), mediaDir, userDataPath, this.flavor);
            }
            this.buffer = line;
            return completedMsg;
        } else {
            this.buffer += `\n${line}`;
            return null;
        }
    }

    /**
     * Flushes and returns any remaining message buffered at the end of stream.
     * 
     * @param {string} mediaDir - Directory containing the chat file and its media attachments.
     * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
     * @returns {Object|null} Final message object, or null if buffer is empty.
     */
    flush(mediaDir, userDataPath) {
        if (this.buffer !== "") {
            const finalMsg = classifyMessage(parseMessageText(this.buffer, this.flavor), mediaDir, userDataPath, this.flavor);
            this.buffer = "";
            return finalMsg;
        }
        return null;
    }
}









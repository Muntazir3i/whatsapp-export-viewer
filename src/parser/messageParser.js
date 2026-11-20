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
export function isMessageStartLine(lineText, flavor) {
  if (flavor === "android") {
    // Android carries the timestamp before the first " - ".
    const [timestampPart] = lineText.split(" - ");
    const [datePart] = timestampPart.split(", ")
    let [day, month, year] = datePart.split("/");
    const fourDigitYear = "20" + year;
    const parsedDate = new Date(fourDigitYear, month - 1, day);
    return !Number.isNaN(parsedDate.getDate());
  } else if (flavor === "ios") {
    // iOS wraps the timestamp in square brackets. Only the text before the
    // closing bracket is the timestamp; the message body may contain more.
    const [beforeClosingBracket] = lineText.split("]")
    // Strip the opening bracket and any leading zero-width/bidi marks. iOS
    // prefixes phone-number senders and attachment lines with U+200E, which
    // would otherwise sit inside the day token and make the date invalid.
    const timestampText = beforeClosingBracket.replaceAll("[", "").replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "").trim();
    const [datePart, timePart] = timestampText.split(",")
    // Continuation lines have no comma, so `timePart` is undefined; guard both
    // parts instead of assuming a complete timestamp is present.
    const trimmedDatePart = (datePart ?? "").trim()
    const trimmedTimePart = (timePart ?? "").trim()
    let [day, month, year] = trimmedDatePart.split("/")
    const fourDigitYear = "20" + year;
    const parsedDate = new Date(fourDigitYear, month - 1, day);
    return !Number.isNaN(parsedDate.getDate());
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
    const separatorIndex = rawMessageText.indexOf(" - ");
    const timestampText = rawMessageText.slice(0, separatorIndex);
    const senderAndMessage = rawMessageText.slice(separatorIndex + 3)

    if (senderAndMessage.includes(": ")) {
        const [sender, ...messageSegments] = senderAndMessage.split(": ");
        const messageBody = messageSegments.join(": ");
        const [datePart, timePart] = timestampText.split(", ");

        return {
            sender: sender,
            message: messageBody,
            timestamp: `${datePart} ${timePart}`
        };
    } else {
        const [datePart, timePart] = timestampText.split(", ");
        return {
            sender: null,
            message: senderAndMessage,
            timestamp: `${datePart} ${timePart}`
        }
    }
  } else if (flavor === "ios") {
    // Timestamp sits between "[" and "]"; strip leading bidi/BOM marks first.
    const normalizedLine = rawMessageText.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
    const closingBracketIndex = normalizedLine.indexOf("]");
    // slice(1, ...) drops "[", the end index excludes "]".
    const timestampText = normalizedLine.slice(1, closingBracketIndex);
    // trimStart handles a missing or doubled space after "]".
    const senderAndMessage = normalizedLine.slice(closingBracketIndex + 1).trimStart();

    if (senderAndMessage.includes(": ")) {
        // Split on the first ": " so colons in the body stay intact.
        const [sender, ...messageSegments] = senderAndMessage.split(": ");
        // Strip the invisible marks iOS adds before numbers and attachments.
        const joinedBody = messageSegments.join(": ");
        const messageBody = joinedBody.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
        const [rawDatePart, rawTimePart] = timestampText.split(", ");
        const datePart = rawDatePart.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
        const timePart = rawTimePart.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");

        return {
            sender: sender,
            message: messageBody,
            timestamp: `${datePart} ${timePart}`
        };
    } else {
        const [datePart, timePart] = timestampText.split(", ");
        return {
            sender: null,
            message: senderAndMessage,
            timestamp: `${datePart} ${timePart}`
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
 * @param {{sender: string|null, message: string, timestamp: string}} parsedMessage - Parsed message.
 * @param {string} mediaDir - Directory holding the chat file and its media files.
 * @param {string} userDataPath - OS userData directory from the Electron main process.
 * @param {"android"|"ios"} flavor - Export format, used for iOS-only markers.
 * @returns {Object} The message with `type`, `extension`, and `category` added.
 */
export function classifyMessage(parsedMessage, mediaDir, userDataPath, flavor) {
    if (parsedMessage.sender === null) {
        // No sender means a system notice in both formats.
        return { ...parsedMessage, type: "system", extension: null, category: null }
    }

    if (parsedMessage.message === "<Media omitted>") {
        // Placeholder for media not included in the export.
        return { ...parsedMessage, type: "media", extension: null, category: null }
    }

    if (parsedMessage.message === "You deleted this message" || parsedMessage.message === "This message was deleted") {
        // Both phrasings appear across formats and locales.
        return { ...parsedMessage, type: "deleted", extension: null, category: null }
    }

    if (parsedMessage.message.endsWith("(file attached)")) {
        // Attachment line: "<filename> (file attached)".
        const fileName = parsedMessage.message.slice(0, parsedMessage.message.indexOf("(file attached)")).trim();

        // A dotted suffix after at least one character is the extension.
        const dotIndex = fileName.lastIndexOf(".");
        const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : null;
        const category = extension ? extensionToCategory[extension] ?? null : null;

        // Media sits next to the chat .txt, which may be a nested folder.
        const mediaFilePath = path.join(mediaDir, fileName);

        return {
            ...parsedMessage,
            message: toStoredMediaPath(userDataPath, mediaFilePath),
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
        if (parsedMessage.message.endsWith("<This message was edited>")) {
            const messageWithoutMarker = parsedMessage.message.replace("<This message was edited>", "");
            return { ...parsedMessage, message: messageWithoutMarker, type: "text", extension: null, category: null }
        } else if (parsedMessage.message.startsWith("<attached") && parsedMessage.message.endsWith(">")) {
            const [, rawAttachmentName] = parsedMessage.message.split(": ")
            const attachmentName = rawAttachmentName.replaceAll(">", "")

            const dotIndex = attachmentName.lastIndexOf(".");
            const extension = dotIndex > 0 ? attachmentName.slice(dotIndex).toLowerCase() : null;
            const category = extension ? extensionToCategory[extension] ?? null : null;
            const mediaFilePath = path.join(mediaDir, attachmentName);
            return {
                ...parsedMessage,
                message: toStoredMediaPath(userDataPath, mediaFilePath),
                extension,
                category,
                type: "file"
            }
        } else if (parsedMessage.message === "You blocked this person" || parsedMessage.message === "You unblocked this person") {
            return { ...parsedMessage, type: "system", extension: null, category: null }
        } else if (parsedMessage.message.includes("Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.")) {
            return { ...parsedMessage, sender: null, type: "system", extension: null, category: null }
        } else if (parsedMessage.message.includes(" • ") && parsedMessage.message.includes("<attached: ") && parsedMessage.message.endsWith(">")) {
            // Quoted reply with an attachment: "<quote> • <attached: file>".
            const separatorIndex = parsedMessage.message.indexOf("• ")
            const replyInfo = parsedMessage.message.slice(separatorIndex + 2)
            const [, rawFileName] = replyInfo.split("<attached: ")
            const fileName = rawFileName.replaceAll(">", "").trim();

            const dotIndex = fileName.lastIndexOf(".");
            const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : null;
            const category = extension ? extensionToCategory[extension] ?? null : null;
            const mediaFilePath = path.join(mediaDir, fileName);
            return {
                ...parsedMessage,
                message: toStoredMediaPath(userDataPath, mediaFilePath),
                extension,
                category,
                type: "file"
            }
        }
    }

    if (LINK_PATTERN.test(parsedMessage.message)) {
        // Renderer turns URLs inside the message into external links.
        return { ...parsedMessage, type: "link", extension: null, category: null }
    }

    // Plain text message.
    return { ...parsedMessage, type: "text", extension: null, category: null }
}


/**
 * Encapsulates multi-line message buffering and line parsing state.
 *
 * An export stores each message as a start line followed by zero or more
 * continuation lines, so the current message is held in `currentMessage` until
 * the next start line (or end of stream) marks it complete.
 */
export class MessageStreamBuffer {
    /**
     * @param {"android"|"ios"} flavor - Export format; selects the line matcher and
     *   timestamp parser used for every line pushed through this buffer.
     */
    constructor(flavor) {
        this.currentMessage = "";
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
            let completedMessage = null;
            if (this.currentMessage !== "") {
                completedMessage = classifyMessage(parseMessageText(this.currentMessage, this.flavor), mediaDir, userDataPath, this.flavor);
            }
            this.currentMessage = line;
            return completedMessage;
        } else {
            this.currentMessage += `\n${line}`;
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
        if (this.currentMessage !== "") {
            const finalMessage = classifyMessage(parseMessageText(this.currentMessage, this.flavor), mediaDir, userDataPath, this.flavor);
            this.currentMessage = "";
            return finalMessage;
        }
        return null;
    }
}









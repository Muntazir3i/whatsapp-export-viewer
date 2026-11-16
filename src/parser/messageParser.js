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
 * Parses a raw single-line or multi-line WhatsApp message string into a structured object.
 *
 * Each flavor strips its own timestamp delimiter, then splits the remainder on the
 * first ": " to separate sender from body. A line without a "Sender: " prefix is a
 * system notice and gets `sender: null`.
 *
 * @param {string} rawMessageText - Raw message text, either "DD/MM/YY, HH:MM - Sender: Message"
 *   (Android) or "[DD/MM/YY, HH:MM:SS AM] Sender: Message" (iOS). Continuation lines of a
 *   multi-line message are already joined with "\n" by `MessageStreamBuffer`.
 * @param {"android"|"ios"} flavor - Export format resolved once per import by `detectFlavor`.
 * @returns {{sender: string|null, message: string, timestamp: string}} Structured message object.
 */
export function parseMessageText(rawMessageText,flavor) {
  if (flavor === "android") {
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
    // Normalize the prefix: iOS may start the line with a bidi mark/BOM, and the
    // timestamp is the part between "[" and "]".
    const line = rawMessageText.replace(/^[\u200E\u200F\u202A-\u202E\uFEFF\s]+/, "");
    const bracketIndex = line.indexOf("]");
    // Starting at 1 skips the "["; ending at bracketIndex excludes the "]".
    const timestampStr = line.slice(1, bracketIndex);
    // trimStart() instead of a fixed offset, so a missing or doubled space after
    // "]" cannot shift the sender into the timestamp.
    const rest = line.slice(bracketIndex + 1).trimStart();

    if (rest.includes(": ")) {
        // Split on the FIRST ": " only, so colons inside the body stay intact.
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
  }
}

/**
 * Classifies a parsed WhatsApp message and assigns a type.
 *
 * Handles system notices, media placeholders, deleted notices, and document
 * attachments (`<name> (file attached)`). Attachments also get a normalized
 * `extension` and a coarse `category` (image, video, audio, document, archive);
 * both are `null` for every other message type.
 *
 * For attachments the `message` field is replaced with the media path, stored
 * relative to the imports directory whenever possible.
 *
 * @param {Object} msgObj - Parsed message object containing `sender`, `message`, and `timestamp`.
 * @param {string} mediaDir - Directory containing the chat file and its media attachments.
 * @param {string} userDataPath - OS userData directory supplied by the Electron main process.
 * @returns {Object} Message object with `type`, `extension`, and `category`.
 */
export function classifyMessage(msgObj, mediaDir, userDataPath) {
    if (msgObj.sender === null) {
        return { ...msgObj, type: "system", extension: null, category: null }

    } else if (msgObj.message === "<Media omitted>") {
        return { ...msgObj, type: "media", extension: null, category: null }

    } else if (msgObj.message === "You deleted this message" || msgObj.message === "This message was deleted") {
        return { ...msgObj, type: "deleted", extension: null, category: null }

    } else if (msgObj.message.endsWith("(file attached)")) {
        const fileName = msgObj.message.slice(0, msgObj.message.indexOf("(file attached)")).trim();

        // Only a dotted suffix after at least one character counts as an extension.
        const dotIndex = fileName.lastIndexOf(".");
        const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : null;
        const category = extension ? extensionToCategory[extension] ?? null : null;

        // Media files are extracted next to the chat .txt file, which is not
        // necessarily the imports root (exports may unpack into a nested folder).
        const absoluteMediaPath = path.join(mediaDir, fileName);

        return {
            ...msgObj,
            message: toStoredMediaPath(userDataPath, absoluteMediaPath),
            extension,
            category,
            type: "file"
        }
    } else {
        return { ...msgObj, type: "text", extension: null, category: null }
    }
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
                completedMsg = classifyMessage(parseMessageText(this.buffer, this.flavor), mediaDir, userDataPath);
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
            const finalMsg = classifyMessage(parseMessageText(this.buffer, this.flavor), mediaDir, userDataPath);
            this.buffer = "";
            return finalMsg;
        }
        return null;
    }
}









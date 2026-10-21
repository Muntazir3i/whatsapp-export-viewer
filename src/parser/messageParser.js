import { extensionToCategory } from "../utils/fileTypes.js";

/**
 * @file messageParser.js
 * @description Logic for identifying message start lines, parsing WhatsApp export line formats, and building structured message objects.
 */

/**
 * Checks if a string line begins with a valid date prefix (DD/MM/YY format).
 *
 * @param {string} lineText - The line text to evaluate.
 * @returns {boolean} True if the prefix represents a valid date, false otherwise.
 */
export function isMessageStartLine(lineText) {
    const [timestampStr] = lineText.split(" - ");
    const [dateString] = timestampStr.split(", ")
    let [day, month, year] = dateString.split("/");
    let fullYear = "20" + year;
    let dateObj = new Date(fullYear, month - 1, day);
    return !Number.isNaN(dateObj.getDate());
}

/**
 * Parses a raw single-line or multi-line WhatsApp message string into a structured object.
 *
 * @param {string} rawMessageText - Raw message string (formatted like "DD/MM/YY, HH:MM - Sender: Message").
 * @returns {Object} Structured message object with `sender`, `message`, and `timestamp`.
 */
export function parseMessageText(rawMessageText) {
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
}

/**
 * Classifies a parsed WhatsApp message and assigns a type.
 *
 * Handles system notices, media placeholders, deleted notices, and document
 * attachments (`<name> (file attached)`). Attachments also get a normalized
 * `extension` and a coarse `category` (image, video, audio, document, archive);
 * both are `null` for every other message type.
 *
 * @param {Object} msgObj - Parsed message object containing `sender`, `message`, and `timestamp`.
 * @returns {Object} Message object with `type`, `extension`, and `category`.
 */
export function classifyMessage(msgObj) {
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

        return { ...msgObj, message: fileName, extension, category, type: "file" }
    } else {
        return { ...msgObj, type: "text", extension: null, category: null }
    }
}


/**
 * Encapsulates multi-line message buffering and line parsing state.
 */
export class MessageStreamBuffer {
    constructor() {
        this.buffer = "";
    }

    /**
     * Processes a single line read from the export stream.
     * 
     * @param {string} line - Current line from the chat file.
     * @returns {Object|null} Parsed message object if a message boundary was completed, or null if accumulating.
     */
    processLine(line) {
        if (isMessageStartLine(line)) {
            let completedMsg = null;
            if (this.buffer !== "") {
                completedMsg = classifyMessage(parseMessageText(this.buffer));
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
     * @returns {Object|null} Final message object, or null if buffer is empty.
     */
    flush() {
        if (this.buffer !== "") {
            const finalMsg = classifyMessage(parseMessageText(this.buffer));
            this.buffer = "";
            return finalMsg;
        }
        return null;
    }
}









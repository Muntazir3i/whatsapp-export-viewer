/**
 * @file electronApi.js
 * @description IPC Bridge wrapper functions for communicating with the Electron main process via window.api.
 * Provides safe defensive checks to prevent runtime crashes when running in non-Electron environments (e.g., standard browser dev mode).
 */

/**
 * Builds a protocol URL for a media path stored in the database.
 *
 * Chromium blocks `file://` subresources when the renderer is served over HTTP
 * (the Vite dev server), so media is streamed by the main process through the
 * privileged `media://` scheme instead.
 *
 * @param {string} storedPath - Absolute or imports-relative path from `messages.message`.
 * @returns {string} URL usable as the `src` of an img/video/audio element.
 */
export function mediaUrl(storedPath) {
  return `media://imports/?path=${encodeURIComponent(storedPath)}`;
}

/**
 * Fetches the list of all available chats from the SQLite database main process IPC.
 * @returns {Promise<Array<{id: string|number, name: string, lastMessage: string, timestamp: string}>>}
 */
export function getChats() {
  if (!window.api?.getChats) {
    console.warn('[electronApi] window.api.getChats is unavailable.');
    return Promise.resolve([]);
  }
  return window.api.getChats();
}

/**
 * Prompts native file picker dialog and executes import ETL pipeline via IPC.
 * @returns {Promise<{ success: boolean, exist?: boolean, canceled?: boolean, error?: string, filePath?: string }>}
 */
export function importChat() {
  if (!window.api?.importChat) {
    console.warn('[electronApi] window.api.importChat is unavailable.');
    return Promise.resolve({ success: false, error: 'IPC unavailable' });
  }
  return window.api.importChat();
}

/**
 * Executes import ETL pipeline with a custom chat name via IPC bridge.
 * @param {string} filePath - Absolute file system path to export file.
 * @param {string} customName - Overridden name for the chat session.
 * @returns {Promise<{ success: boolean, exist?: boolean, error?: string, filePath?: string }>}
 */
export function importChatWithName(filePath, customName) {
  if (!window.api?.importChatWithName) {
    console.warn('[electronApi] window.api.importChatWithName is unavailable.');
    return Promise.resolve({ success: false, error: 'IPC unavailable' });
  }
  return window.api.importChatWithName(filePath, customName);
}

/**
 * Fetches initial latest messages for a specific chat ID from the SQLite database.
 * @param {string|number} chatId - The ID of the chat whose messages are being requested.
 * @returns {Promise<Array<{id: string|number, sender: string, message: string, timestamp: string}>>}
 */
export function getMessages(chatId) {
  if (!window.api?.getMessages) {
    console.warn('[electronApi] window.api.getMessages is unavailable.');
    return Promise.resolve([]);
  }
  return window.api.getMessages(chatId);
}

/**
 * Deletes a chat by ID via IPC command to main process.
 * @param {string|number} chatId - The ID of the chat to delete.
 * @returns {Promise<boolean>}
 */
export function deleteChat(chatId,chatName) {
  if (!window.api?.deleteChat) {
    console.warn('[electronApi] window.api.deleteChat is unavailable.');
    return Promise.resolve(false);
  }
  return window.api.deleteChat(chatId,chatName);
}

/**
 * Fetches older messages for a specific chat ID prior to cursorId for cursor-based pagination.
 * @param {string|number} chatId - The ID of the target chat.
 * @param {string|number} cursorId - The threshold message ID (fetches messages with id < cursorId).
 * @returns {Promise<Array<{id: string|number, sender: string, message: string, timestamp: string}>>}
 */
export function loadMessages(chatId, cursorId) {
  const apiMethod = window.api?.loadMessages || window.api?.loadMoreMessages;
  if (!apiMethod) {
    console.warn('[electronApi] window.api.loadMessages is unavailable.');
    return Promise.resolve([]);
  }
  return apiMethod(chatId, cursorId);
}

/**
 * Alias for `loadMessages` for API naming flexibility across components.
 * @param {string|number} chatId
 * @param {string|number} cursorId
 * @returns {Promise<Array<Object>>}
 */
export function loadMoreMessages(chatId, cursorId) {
  return loadMessages(chatId, cursorId);
}

/**
 * Subscribes to import progress events from the main process.
 * @param {Function} callback - Receives `{ phase, percent, current, total }`.
 * @returns {Function} Unsubscribe function (no-op when IPC is unavailable).
 */
export function onImportProgress(callback) {
  if (!window.api?.onImportProgress) {
    console.warn('[electronApi] window.api.onImportProgress is unavailable.');
    return () => {};
  }
  return window.api.onImportProgress(callback);
}
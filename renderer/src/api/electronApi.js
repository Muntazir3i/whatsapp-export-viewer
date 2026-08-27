/**
 * @file electronApi.js
 * @description IPC Bridge wrapper functions for communicating with the Electron main process via window.api.
 * Provides safe defensive checks to prevent runtime crashes when running in non-Electron environments (e.g., standard browser dev mode).
 */

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
 * Fetches messages for a specific chat ID from the SQLite database.
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
export function deleteChat(chatId) {
  if (!window.api?.deleteChat) {
    console.warn('[electronApi] window.api.deleteChat is unavailable.');
    return Promise.resolve(false);
  }
  return window.api.deleteChat(chatId);
}
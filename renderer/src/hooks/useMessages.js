import { useState, useEffect, useCallback } from "react";
import { getMessages, loadMessages } from "../api/electronApi.js";

/**
 * Custom hook to asynchronously fetch messages for a specific chat ID, with pagination support.
 * Uses derived loading state to avoid synchronous setState calls in useEffect.
 * Features unmount safety to prevent out-of-order responses during fast chat switches.
 *
 * @param {string|number|null} chatId - The target chat ID.
 * @returns {{
 *   messages: Array<Object>,
 *   loading: boolean,
 *   loadingMore: boolean,
 *   hasMore: boolean,
 *   error: Error|null,
 *   loadMoreMessages: Function
 * }}
 */
export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [fetchedChatId, setFetchedChatId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Derive loading state: loading is true when a valid chatId is selected but data hasn't finished fetching for it yet.
  const loading = Boolean(chatId && fetchedChatId !== chatId);

  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;

    getMessages(chatId)
      .then((result) => {
        if (isMounted) {
          const loaded = result || [];
          setMessages(loaded);
          setError(null);
          setFetchedChatId(chatId);
          setHasMore(loaded.length >= 100);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setFetchedChatId(chatId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  /**
   * Fetches older messages prior to the current oldest message ID (messages[0].id) and prepends them.
   */
  const handleLoadMore = useCallback(async () => {
    if (!chatId || !messages.length || loadingMore || !hasMore) return;

    // The oldest message currently in state is at index 0
    const oldestMessageId = messages[0]?.id;
    if (!oldestMessageId) return;

    setLoadingMore(true);
    try {
      const olderMessages = await loadMessages(chatId, oldestMessageId);
      if (olderMessages && olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
        setHasMore(olderMessages.length >= 100);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[useMessages] Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, messages, loadingMore, hasMore]);

  return {
    messages: chatId ? messages : [],
    loading,
    loadingMore,
    hasMore,
    error: chatId ? error : null,
    loadMoreMessages: handleLoadMore,
  };
}
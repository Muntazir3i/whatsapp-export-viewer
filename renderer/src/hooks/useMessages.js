import { useState, useEffect } from "react";
import { getMessages, loadMessages } from "../api/electronApi.js";


/**
 * Custom hook to asynchronously fetch messages for a specific chat ID.
 * Uses derived loading state to avoid synchronous setState calls in useEffect.
 * Features unmount safety to prevent out-of-order responses during fast chat switches.
 *
 * @param {string|number|null} chatId - The target chat ID.
 * @returns {{ messages: Array<Object>, loading: boolean, error: Error|null }}
 */
export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [fetchedChatId, setFetchedChatId] = useState(null);
  const [hasMore, setHasMore] = useState(false);



  // Derive loading state: loading is true when a valid chatId is selected but data hasn't finished fetching for it yet.
  const loading = Boolean(chatId && fetchedChatId !== chatId);

  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;

    getMessages(chatId)
      .then((result) => {
        if (isMounted) {
          if (result.length >= 100) {
            setHasMore(true)
          }

          setMessages(result || []);
          setError(null);
          setFetchedChatId(chatId);
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



  const loadMore = (chatId) => {

    let itemId = messages[0].id
    loadMessages(chatId, itemId)
      .then((result) => {
        if(result.length < 100){
          setHasMore(false)
        }
        setMessages((prev) => [...result, ...prev]);
      }).catch((err) => {
        console.log(err);
      })

  }

  return {
    messages: chatId ? messages : [],
    loading,
    error: chatId ? error : null,
    loadMore: loadMore,
    hasMore: hasMore,
  };
}
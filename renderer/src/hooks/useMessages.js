import { useState, useEffect, useRef } from "react";
import {
  getMessages,
  loadMessages,
  getMessageWindow,
  loadNewerMessages,
} from "../api/electronApi.js";

/** Messages loaded per page, matching the repository window size. */
const PAGE_SIZE = 100;


/**
 * Custom hook to asynchronously fetch messages for a specific chat ID.
 * Uses derived loading state to avoid synchronous setState calls in useEffect.
 * Features unmount safety to prevent out-of-order responses during fast chat switches.
 *
 * Also exposes search navigation: `jumpToMessage` replaces the list with a window
 * ending at a search hit, and `jumpToLatest` restores the newest page.
 *
 * @param {string|number|null} chatId - The target chat ID.
 * @returns {{
 *   messages: Array<Object>,
 *   loading: boolean,
 *   error: Error|null,
 *   loadMore: Function,
 *   hasMore: boolean,
 *   loadNewer: Function,
 *   hasNewer: boolean,
 *   loadingNewer: boolean,
 *   focusMessageId: number|null,
 *   jumpToMessage: Function,
 *   jumpToLatest: Function
 * }}
 */
export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [fetchedChatId, setFetchedChatId] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Only true after a search jump that did not reach the newest message.
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);

  // Search jump target, tagged with the chat it belongs to so switching chats
  // clears the highlight without resetting state inside an effect.
  const [focus, setFocus] = useState({ chatId: null, messageId: null });
  const focusMessageId = focus.chatId === chatId ? focus.messageId : null;

  // Latest chat, so a slow jump response cannot overwrite a newer conversation.
  const chatIdRef = useRef(chatId);
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);



  // Derive loading state: loading is true when a valid chatId is selected but data hasn't finished fetching for it yet.
  const loading = Boolean(chatId && fetchedChatId !== chatId);

  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;

    getMessages(chatId)
      .then((result) => {
        if (isMounted) {
          if (result.length >= PAGE_SIZE) {
            setHasMore(true)
          }

          setMessages(result || []);
          setError(null);
          setFetchedChatId(chatId);
          setHasNewer(false);
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

    const itemId = messages[0]?.id;
    if (!itemId) return;

    loadMessages(chatId, itemId)
      .then((result) => {
        if(result.length < PAGE_SIZE){
          setHasMore(false)
        }
        setMessages((prev) => [...result, ...prev]);
      }).catch((err) => {
        console.error(err);
      })

  }

  /**
   * Loads a window centered on a search hit, the target, and its neighbours.
   *
   * @param {string|number} messageId - Target message ID from a search result.
   */
  const jumpToMessage = (messageId) => {
    if (!chatId || !messageId) return;

    getMessageWindow(chatId, messageId)
      .then((payload) => {
        if (chatIdRef.current !== chatId) return;

        const rows = payload?.messages ?? [];

        setMessages(rows);
        setHasMore(Boolean(payload?.hasOlder));
        setHasNewer(Boolean(payload?.hasNewer));
        setError(null);
        setFetchedChatId(chatId);
        setFocus({ chatId, messageId: Number(messageId) });
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /** Restores the newest page and clears the search highlight. */
  const jumpToLatest = () => {
    if (!chatId) return;

    setFocus({ chatId, messageId: null });
    setHasNewer(false);

    getMessages(chatId)
      .then((result) => {
        if (chatIdRef.current !== chatId) return;

        const rows = result || [];

        setMessages(rows);
        setHasMore(rows.length >= PAGE_SIZE);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /**
   * Appends the next batch of messages below a search jump, until the newest
   * message is reached.
   */
  const loadNewer = () => {
    const lastId = messages[messages.length - 1]?.id;
    if (!chatId || !lastId || loadingNewer) return;

    setLoadingNewer(true);

    loadNewerMessages(chatId, lastId)
      .then((rows) => {
        if (chatIdRef.current !== chatId) return;

        setMessages((previous) => {
          // Ignore a batch that no longer follows the visible list.
          if (previous[previous.length - 1]?.id !== lastId) return previous;
          return [...previous, ...rows];
        });

        setHasNewer((rows?.length ?? 0) >= PAGE_SIZE);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingNewer(false);
      });
  };

  return {
    messages: chatId ? messages : [],
    loading,
    error: chatId ? error : null,
    loadMore: loadMore,
    hasMore: hasMore,
    loadNewer,
    hasNewer,
    loadingNewer,
    focusMessageId,
    jumpToMessage,
    jumpToLatest,
  };
}

import { useEffect, useState } from 'react';
import { searchMessages } from '../api/electronApi.js';

/** Debounce before a query reaches SQLite. */
const DEBOUNCE_MS = 250;

/** Results fetched per page. */
export const SEARCH_PAGE_SIZE = 50;

/** Minimum trimmed length sent to the main process (mirrors the parser minimum). */
export const MIN_SEARCH_LENGTH = 2;

/** Empty search state, reused when no results belong to the current chat yet. */
const EMPTY = { chatId: null, query: null, rows: [], total: 0, status: 'idle' };

/**
 * Owns in-chat search state so results survive closing the search panel.
 *
 * Results are chronological (newest first) and paginated by ID cursor, matching
 * the repository. The total match count comes from the same query, so the UI can
 * show progress such as "50 of 217" before every page is loaded.
 *
 * @param {string|number|null} chatId - Chat being searched.
 * @param {boolean} active - Whether the search panel is open (debounced queries run only while active).
 * @returns {{
 *   query: string,
 *   setQuery: Function,
 *   trimmed: string,
 *   status: 'idle'|'loading'|'done'|'error',
 *   results: Array<Object>,
 *   total: number,
 *   hasMore: boolean,
 *   loadingMore: boolean,
 *   loadMore: Function,
 *   reset: Function
 * }}
 */
export function useChatSearch(chatId, active) {
  // The query is tagged with its chat, so switching chats clears it by derivation
  // instead of resetting state inside an effect.
  const [queryState, setQueryState] = useState({ chatId: null, value: '' });
  const [state, setState] = useState(EMPTY);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = queryState.chatId === chatId ? queryState.value : '';
  const setQuery = (value) => setQueryState({ chatId, value });

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_SEARCH_LENGTH;

  // Results from another chat are ignored rather than cleared.
  const current = state.chatId === chatId ? state : EMPTY;

  const status = tooShort
    ? 'idle'
    : current.query === trimmed
      ? current.status
      : 'loading';

  const results = tooShort ? [] : current.rows;
  const total = tooShort ? 0 : current.total;
  const hasMore = results.length < total;

  useEffect(() => {
    if (!active || tooShort) return;

    // Reopening the panel with the same query keeps already loaded pages.
    if (current.query === trimmed && current.status === 'done') return;

    let cancelled = false;

    const timer = setTimeout(() => {
      searchMessages(chatId, trimmed, SEARCH_PAGE_SIZE)
        .then((payload) => {
          if (cancelled) return;
          setState({
            chatId,
            query: trimmed,
            rows: payload?.results ?? [],
            total: payload?.total ?? 0,
            status: 'done',
          });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ chatId, query: trimmed, rows: [], total: 0, status: 'error' });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, chatId, current.query, current.status, trimmed, tooShort]);

  /**
   * Appends the next page of older matches.
   *
   * @returns {Promise<Array<Object>>} Rows added by this page.
   */
  const loadMore = async () => {
    if (tooShort || loadingMore || results.length >= total) return [];

    const lastId = results[results.length - 1]?.id;
    if (!lastId) return [];

    setLoadingMore(true);

    try {
      const payload = await searchMessages(chatId, trimmed, SEARCH_PAGE_SIZE, lastId);
      const older = payload?.results ?? [];

      setState((previous) => {
        // Ignore a page that finished after the query or chat changed.
        if (previous.chatId !== chatId || previous.query !== trimmed) return previous;

        const seen = new Set(previous.rows.map((row) => row.id));

        return {
          ...previous,
          rows: [...previous.rows, ...older.filter((row) => !seen.has(row.id))],
          total: payload?.total ?? previous.total,
        };
      });

      return older;
    } finally {
      setLoadingMore(false);
    }
  };

  /** Clears the query and results. */
  const reset = () => {
    setQueryState({ chatId, value: '' });
    setState(EMPTY);
  };

  return {
    query,
    setQuery,
    trimmed,
    status,
    results,
    total,
    hasMore,
    loadingMore,
    loadMore,
    reset,
  };
}

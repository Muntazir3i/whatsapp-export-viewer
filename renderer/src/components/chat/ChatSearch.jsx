import { useEffect, useRef, useState } from 'react';
import { searchMessages } from '../../api/electronApi.js';

/** Debounce before a query reaches SQLite. */
const DEBOUNCE_MS = 250;

/** Minimum trimmed length sent to the main process (mirrors the parser minimum). */
const MIN_QUERY_LENGTH = 2;

/**
 * Shortens a stored timestamp to its clock portion ("7:36:20 PM" -> "7:36 PM").
 *
 * @param {string} [timestamp] - Stored `date time` timestamp.
 * @returns {string} Short time label.
 */
function formatTime(timestamp) {
  const time = (timestamp || '').split(' ').slice(1).join(' ').trim();
  return time.replace(/^(\d{1,2}:\d{2}):\d{2}/, '$1') || timestamp || '';
}

/**
 * Renders an FTS5 snippet, turning the `\u0001`/`\u0002` match markers into `<mark>`.
 *
 * @param {Object} props
 * @param {string} [props.text] - Snippet returned by `snippet(message_fts, ...)`.
 * @returns {JSX.Element}
 */
function Snippet({ text = '' }) {
  return text.split('\u0001').map((chunk, index) => {
    // Text before the first marker is plain context.
    if (index === 0) return <span key={index}>{chunk}</span>;

    const [highlight, rest = ''] = chunk.split('\u0002');

    return (
      <span key={index}>
        <mark className="rounded-sm bg-[#53bdeb]/30 px-0.5 text-[#e9edef]">
          {highlight}
        </mark>
        {rest}
      </span>
    );
  });
}

/**
 * In-chat full-text search panel: a debounced input and the matching messages.
 * Selecting a result hands the message ID back so the chat can jump to it.
 *
 * @component
 * @param {Object} props
 * @param {number|string} props.chatId - Chat being searched.
 * @param {Function} props.onSelect - Called with the message ID of a chosen result.
 * @param {Function} props.onClose - Closes the search panel.
 * @returns {JSX.Element}
 */
export const ChatSearch = ({ chatId, onSelect, onClose }) => {
  const [query, setQuery] = useState('');

  // Results are tagged with the query they belong to, so "loading" can be derived
  // while the debounced request is in flight instead of set inside the effect.
  const [resultState, setResultState] = useState({
    query: null,
    rows: [],
    status: 'idle',
  });

  const inputRef = useRef(null);

  // Focus the field as soon as the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  const status = tooShort
    ? 'idle'
    : resultState.query === trimmed
      ? resultState.status
      : 'loading';

  const results = tooShort ? [] : resultState.rows;

  useEffect(() => {
    if (tooShort) return;

    let active = true;

    const timer = setTimeout(() => {
      searchMessages(chatId, trimmed)
        .then((rows) => {
          if (!active) return;
          setResultState({ query: trimmed, rows: rows || [], status: 'done' });
        })
        .catch(() => {
          if (!active) return;
          setResultState({ query: trimmed, rows: [], status: 'error' });
        });
    }, DEBOUNCE_MS);

    // Cancel the pending request when the query changes again (stale-response guard).
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [chatId, trimmed, tooShort]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#111b21]">
      {/* Search field */}
      <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2 flex-shrink-0">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-[#2a3942] px-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-[#8696a0]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
            }}
            placeholder="Search in chat"
            aria-label="Search in chat"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex-shrink-0 rounded-full p-0.5 text-[#8696a0] transition-colors hover:text-[#e9edef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[13px] text-[#aebac1] transition-colors hover:bg-white/5 hover:text-[#e9edef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
        >
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {status === 'idle' && (
          <p className="px-4 py-6 text-center text-[13px] text-[#8696a0]">
            Type at least {MIN_QUERY_LENGTH} characters to search this chat.
          </p>
        )}

        {status === 'loading' && (
          <p className="px-4 py-6 text-center text-[13px] text-[#8696a0]">
            Searching…
          </p>
        )}

        {status === 'error' && (
          <p className="px-4 py-6 text-center text-[13px] text-[#8696a0]">
            Search is unavailable right now.
          </p>
        )}

        {status === 'done' && results.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-[#8696a0]">
            No messages found.
          </p>
        )}

        {status === 'done' && results.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[12px] uppercase tracking-wide text-[#8696a0]">
              {results.length} {results.length === 1 ? 'message' : 'messages'}
            </p>

            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(result.id)}
                    className="w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#53bdeb]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[#53bdeb]">
                        {result.sender || 'Unknown'}
                      </span>
                      <span className="flex-shrink-0 text-[11px] text-[#8696a0]">
                        {formatTime(result.timestamp)}
                      </span>
                    </div>

                    <p className="mt-0.5 break-words text-[13.5px] leading-[19px] text-[#d1d7db]">
                      <Snippet text={result.snippet} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

import { useEffect, useRef } from 'react';
import { MIN_SEARCH_LENGTH } from '../../hooks/useChatSearch.js';

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
 * @param {string} [props.text] - Snippet returned by `snippet(messages_fts, ...)`.
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
 * In-chat search panel: input, result list, and cursor-based "show more".
 * Search state lives in `useChatSearch` so results survive closing the panel and
 * the arrows can keep navigating after a jump.
 *
 * @component
 * @param {Object} props
 * @param {string} props.query - Current query text.
 * @param {Function} props.onQueryChange - Updates the query.
 * @param {Function} props.onClose - Closes the search panel.
 * @param {'idle'|'loading'|'done'|'error'} props.status - Derived search status.
 * @param {Array<Object>} props.results - Loaded matches, newest first.
 * @param {number} props.total - Total matches in this chat.
 * @param {boolean} props.hasMore - Whether older matches are not loaded yet.
 * @param {boolean} props.loadingMore - Whether the next page is in flight.
 * @param {Function} props.onLoadMore - Loads the next page.
 * @param {Function} props.onSelect - Called with the index of a chosen result.
 * @returns {JSX.Element}
 */
export const ChatSearch = ({
  query,
  onQueryChange,
  onClose,
  status,
  results,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
}) => {
  const inputRef = useRef(null);

  // Focus the field as soon as the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
            onChange={(event) => onQueryChange(event.target.value)}
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
              onClick={() => onQueryChange('')}
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
            Type at least {MIN_SEARCH_LENGTH} characters to search this chat.
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
              {total} {total === 1 ? 'message' : 'messages'}
            </p>

            <ul>
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
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

            {hasMore && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full rounded-md bg-[#202c33] py-2 text-[13px] text-[#e9edef] transition-colors hover:bg-[#2a3942] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                >
                  {loadingMore
                    ? 'Loading…'
                    : `Show more (${total - results.length} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

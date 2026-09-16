import { Fragment, useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';

/**
 * Main active chat view component displaying chat header, message list with date dividers,
 * incoming/outgoing message bubbles, and read-only footer input.
 *
 * PAGINATION FEATURES:
 * 1. Automatic top-scroll trigger (`scrollTop === 0`) to fetch older messages.
 * 2. Manual "Load More" button at top of message history container.
 * 3. Viewport scroll height preservation logic to prevent scroll jumping when prepending items.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Selected chat metadata.
 * @param {string} props.currentUser - Name of the active participant profile.
 * @param {Array<Object>} props.messages - Chronological array of message items.
 * @param {Function} props.loadMore - Callback function to fetch older messages from backend SQLite DB.
 * @param {boolean} props.hasMore - Boolean flag indicating if more historical messages exist.
 * @param {Function} props.isOutgoingMessage - Function checking if message is outgoing.
 * @param {React.RefObject} props.messagesEndRef - Ref DOM target for auto-scrolling on initial render.
 * @returns {JSX.Element}
 */
export const ChatView = ({
  selectedChat,
  currentUser,
  messages,
  loadMore,
  hasMore,
  isOutgoingMessage,
  messagesEndRef,
}) => {
  // PAGINATION STATE: Stores container scrollHeight prior to fetching older messages
  const [oldScrollHeight, setOldScrollHeight] = useState(0);

  // PAGINATION STATE: Tracks whether older messages are currently being fetched
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // DOM REF: Ref attached to scrollable container for measuring scroll height and restoring position
  const scrollDivContainer = useRef(null);

  /**
   * PAGINATION EFFECT - PRESERVE SCROLL POSITION:
   * When older messages are loaded, they are prepended at the top of the array, increasing `scrollHeight`.
   * Without position restoration, the scroll viewport would jump to the top of the container.
   * By calculating `heightDifference = newScrollHeight - oldScrollHeight` and assigning `scrollTop = heightDifference`,
   * the scroll position stays locked to the exact message the user was previously viewing.
   */
  useEffect(() => {
    if (isLoadingMore && scrollDivContainer.current) {
      const heightDifference = scrollDivContainer.current.scrollHeight - oldScrollHeight;
      setIsLoadingMore(false);
      scrollDivContainer.current.scrollTop = heightDifference;
    }
  }, [messages, isLoadingMore, oldScrollHeight]);

  /**
   * PAGINATION SCROLL LISTENER:
   * Triggers when the user scrolls the message container.
   * Checks if `scrollTop === 0` (top of scroll container reached). If so, saves the current `scrollHeight`,
   * sets `isLoadingMore` to true, and invokes `loadMore(selectedChat.id)`.
   */
  const handleScroll = (event) => {
    const { scrollTop, scrollHeight } = event.currentTarget;

    // Detect scroll top boundary
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      setOldScrollHeight(scrollHeight);
      setIsLoadingMore(true);
      loadMore(selectedChat.id);
    }
  };

  /**
   * MANUAL PAGINATION BUTTON HANDLER:
   * Triggered when user explicitly clicks the "Load More" button at top of list.
   */
  const handleLoadMore = () => {
    if (!scrollDivContainer.current || isLoadingMore) return;
    setOldScrollHeight(scrollDivContainer.current.scrollHeight);
    setIsLoadingMore(true);
    loadMore(selectedChat.id);
  };

  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
      {/* Top sticky chat header */}
      <ChatHeader selectedChat={selectedChat} currentUser={currentUser} />

      {/* Scrollable messages container with overflow protection against horizontal scrolling */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-[#0b141a]"
        onScroll={handleScroll}
        ref={scrollDivContainer}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* PAGINATION UI: Rendered at the top of message history when older messages exist in SQLite database */}
        {hasMore && (
          <div className="flex justify-center my-2">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="bg-[#182229] hover:bg-[#202c33] active:scale-95 text-[#00a884] text-xs font-medium px-4 py-1.5 rounded-full border border-[#222d34] shadow-sm transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-[#00a884] disabled:opacity-50 cursor-pointer"
            >
              {isLoadingMore ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-[#00a884]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Loading older messages...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-[#00a884]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                  <span>Load older messages</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Message items list rendering */}
        {messages.map((msg, index) => {
          const isOutgoing = isOutgoingMessage(msg);

          // Extract date string for date section dividers
          const currentDate = msg.timestamp ? msg.timestamp.split(',')[0] : null;
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const previousDate = previousMsg?.timestamp ? previousMsg.timestamp.split(',')[0] : null;

          const showDateDivider = currentDate && currentDate !== previousDate;

          return (
            <Fragment key={msg.id ?? `${index}-${msg.timestamp}`}>
              {/* Sticky date section header */}
              {showDateDivider && (
                <div className="flex justify-center my-3">
                  <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
                    {currentDate}
                  </span>
                </div>
              )}

              {/* Message Bubble Row Container */}
              <div
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full`}
              >
                {/* Message Bubble Box with min-w-0 and break-words to prevent horizontal overflow */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg px-3 py-1.5 text-sm shadow ${
                    isOutgoing
                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                      : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                  }`}
                >
                  {/* Sender label for incoming group messages */}
                  {!isOutgoing && msg.sender && (
                    <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5 truncate">
                      {msg.sender}
                    </span>
                  )}

                  {/* Message body text and timestamp footer */}
                  <div className="flex items-end gap-3 min-w-0">
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed min-w-0 flex-1">
                      {msg.message}
                    </p>

                    <span className="text-[10px] text-[#8696a0] whitespace-nowrap flex-shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}

        {/* Target element for auto-scroll into view on initial load */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom read-only input indicator */}
      <ReadOnlyInput />
    </div>
  );
};

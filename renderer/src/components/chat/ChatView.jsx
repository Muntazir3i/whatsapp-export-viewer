import { Fragment, useRef, useLayoutEffect } from 'react';
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';

/**
 * Main active chat view component displaying chat header, message list with date dividers,
 * incoming/outgoing message bubbles, read-only footer input, and pagination controls.
 * Features scroll position preservation when prepending older messages.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Selected chat metadata.
 * @param {string} props.currentUser - Name of the active participant profile.
 * @param {Array<Object>} props.messages - Chronological array of message items.
 * @param {Function} props.isOutgoingMessage - Function checking if message is outgoing.
 * @param {React.RefObject} props.messagesEndRef - Ref DOM target for auto-scrolling.
 * @param {boolean} [props.loadingMore] - Indicates if older messages are currently being fetched.
 * @param {boolean} [props.hasMore] - Indicates if older messages are available to load.
 * @param {Function} [props.loadMoreMessages] - Callback function to fetch older messages.
 * @returns {JSX.Element}
 */
export const ChatView = ({
  selectedChat,
  currentUser,
  messages,
  isOutgoingMessage,
  messagesEndRef,
  loadingMore = false,
  hasMore = false,
  loadMoreMessages,
}) => {
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  /**
   * Preserve scroll position relative to newly prepended older messages.
   * Adjusts scrollTop before paint to prevent viewport jumping.
   */
  useLayoutEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop = heightDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  /**
   * Helper to capture current container scroll height before triggering loadMoreMessages.
   */
  const triggerLoadMore = () => {
    if (containerRef.current && !loadingMore && hasMore && loadMoreMessages) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      loadMoreMessages();
    }
  };

  /**
   * Scroll handler to trigger loadMoreMessages when scrolling to the top of the message list.
   * @param {React.UIEvent<HTMLDivElement>} e
   */
  const handleScroll = (e) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loadingMore) {
      triggerLoadMore();
    }
  };

  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
      {/* Top sticky chat header */}
      <ChatHeader selectedChat={selectedChat} currentUser={currentUser} />

      {/* Scrollable messages container with subtle background pattern */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* Load older messages button & loading indicator */}
        {hasMore && (
          <div className="flex justify-center my-3">
            <button
              type="button"
              onClick={triggerLoadMore}
              disabled={loadingMore}
              className="bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] text-xs font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            >
              {loadingMore ? 'Loading older messages...' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Message bubbles */}
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

              {/* Message Bubble Container */}
              <div
                className={`flex ${
                  isOutgoing ? 'justify-end' : 'justify-start'
                } w-full`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow ${
                    isOutgoing
                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                      : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                  }`}
                >
                  {/* Sender label for incoming group messages */}
                  {!isOutgoing && msg.sender && (
                    <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5">
                      {msg.sender}
                    </span>
                  )}

                  {/* Message body text and timestamp footer */}
                  <div className="flex items-end gap-3">
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
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

        {/* Target element for auto-scroll into view */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom read-only input indicator */}
      <ReadOnlyInput />
    </div>
  );
};

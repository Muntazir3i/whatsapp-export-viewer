import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';
import { LoadMoreButton } from './LoadMoreButton.jsx';
import { ChatMessage } from './ChatMessage.jsx';

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
  }, [messages]);

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
        {hasMore && <LoadMoreButton handleLoadMore={handleLoadMore} isLoadingMore={isLoadingMore} />}

        {/* Message items list rendering */}
        {messages.map((msg, index) => {
          const isOutgoing = isOutgoingMessage(msg);

          // Extract date string for date section dividers
          const currentDate = msg.timestamp ? msg.timestamp.split(',')[0] : null;
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const previousDate = previousMsg?.timestamp ? previousMsg.timestamp.split(',')[0] : null;

          const showDateDivider = currentDate && currentDate !== previousDate;

          return (<ChatMessage
            key={msg.id ?? `${index}-${msg.timestamp}`}
            msg={msg}
            isOutgoing={isOutgoing}
            showDateDivider={showDateDivider}
            currentDate={currentDate}
          />);
        })}

        {/* Target element for auto-scroll into view on initial load */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom read-only input indicator */}
      <ReadOnlyInput />
    </div>
  );
};

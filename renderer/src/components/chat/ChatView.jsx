import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';
import { LoadMoreButton } from './LoadMoreButton.jsx';
import { ChatMessage } from './ChatMessage.jsx';
import { ChatInfo } from './ChatInfo.jsx';

/** Subtle doodle pattern used behind the message list, like the WhatsApp chat wallpaper. */
const CHAT_DOODLE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='.035' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M18 34c0-7 6-13 13-13h20c7 0 13 6 13 13v9c0 7-6 13-13 13H38l-9 8v-8h-2z'/%3E%3Cpath d='M196 26c7 0 13 6 13 13s-6 13-13 13-13-6-13-13 6-13 13-13z'/%3E%3Cpath d='M49 146l13 13 22-27'/%3E%3Cpath d='M164 190h44M164 200h30'/%3E%3Cpath d='M205 128l5 12 13 2-9 9 2 13-11-6-11 6 2-13-9-9 13-2z'/%3E%3Cpath d='M104 74c-8 0-14 6-14 14s6 14 14 14c3 0 6-1 8-3l7 3-2-7c1-2 2-4 2-7 0-8-6-14-15-14z'/%3E%3C/g%3E%3C/svg%3E")`;

/**
 * Expands a short export date ("25/04/22") into a divider label ("25/04/2022").
 *
 * @param {string} datePart - Date portion of the stored timestamp.
 * @returns {string} Human-readable date label.
 */
function formatDateLabel(datePart) {
  const [day, month, year] = (datePart || "").split("/");
  if (!day || !month || !year) return datePart || "";
  return `${day}/${month}/${year.length === 2 ? `20${year}` : year}`;
}

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

  // Whether the chat info panel is open instead of the message list.
  const [showInfo, setShowInfo] = useState(false);

  // Reset the info panel synchronously when switching conversations.
  const [prevChatId, setPrevChatId] = useState(selectedChat?.id);
  if (selectedChat?.id !== prevChatId) {
    setPrevChatId(selectedChat?.id);
    setShowInfo(false);
  }

  // PAGINATION STATE: Tracks whether older messages are currently being fetched
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // DOM REF: Ref attached to scrollable container for measuring scroll height and restoring position
  const scrollDivContainer = useRef(null);

  // DOM REF: Wrapper around the message list, observed for height changes caused
  // by images, stickers and videos finishing loading after the first render.
  const scrollContentRef = useRef(null);

  // Whether the viewport is currently pinned to the newest message.
  const isPinnedToBottom = useRef(true);

  /**
   * KEEP PINNED TO BOTTOM:
   * Media attachments load asynchronously, so the content height grows after the
   * initial scroll. While the user is at the bottom, re-pin on every resize so
   * the newest message stays in view instead of leaving the viewport mid-list.
   */
  useEffect(() => {
    const container = scrollDivContainer.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;

    const keepAtBottom = () => {
      if (!isPinnedToBottom.current || isLoadingMore) return;
      container.scrollTop = container.scrollHeight;
    };

    // Jump straight to the newest message on mount.
    keepAtBottom();

    const observer = new ResizeObserver(keepAtBottom);
    observer.observe(content);
    return () => observer.disconnect();
  }, [isLoadingMore]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  /**
   * PAGINATION SCROLL LISTENER:
   * Triggers when the user scrolls the message container.
   * Checks if `scrollTop === 0` (top of scroll container reached). If so, saves the current `scrollHeight`,
   * sets `isLoadingMore` to true, and invokes `loadMore(selectedChat.id)`.
   */
  const handleScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // Stay pinned only while the user is within ~80px of the newest message.
    isPinnedToBottom.current = scrollHeight - (scrollTop + clientHeight) < 80;

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
    <div className="w-full sm:ml-[340px] md:ml-[clamp(340px,30%,420px)] h-screen flex flex-col bg-[#0b141a] overflow-hidden">
      {/* Top sticky chat header */}
      <ChatHeader
        selectedChat={selectedChat}
        currentUser={currentUser}
        onOpenInfo={() => setShowInfo(true)}
      />

      {/* Chat info replaces the message list while open */}
      {showInfo && (
        <ChatInfo
          key={selectedChat?.id}
          selectedChat={selectedChat}
          onBack={() => setShowInfo(false)}
        />
      )}

      {!showInfo && (
      <>
      {/* Scrollable messages container with overflow protection against horizontal scrolling */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-10 lg:px-16 py-3 bg-[#0b141a]"
        onScroll={handleScroll}
        ref={scrollDivContainer}
        style={{
          backgroundImage: CHAT_DOODLE,
          backgroundRepeat: 'repeat',
          backgroundSize: '260px 260px',
        }}
      >
        <div ref={scrollContentRef} className="space-y-1.5">
        {/* PAGINATION UI: Rendered at the top of message history when older messages exist in SQLite database */}
        {hasMore && <LoadMoreButton handleLoadMore={handleLoadMore} isLoadingMore={isLoadingMore} />}

        {/* Message items list rendering */}
        {messages.map((msg, index) => {
          const isOutgoing = isOutgoingMessage(msg);

          // Exports store "date time"; only the date drives the dividers.
          const currentDate = msg.timestamp ? msg.timestamp.split(' ')[0] : null;
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const previousDate = previousMsg?.timestamp ? previousMsg.timestamp.split(' ')[0] : null;

          const showDateDivider = Boolean(currentDate) && currentDate !== previousDate;

          // A new sender or a new day starts a fresh bubble group (tail + name).
          const isFirstInGroup =
            !previousMsg || previousMsg.sender !== msg.sender || currentDate !== previousDate;

          return (<ChatMessage
            key={msg.id ?? `${index}-${msg.timestamp}`}
            msg={msg}
            isOutgoing={isOutgoing}
            showDateDivider={showDateDivider}
            dateLabel={formatDateLabel(currentDate)}
            isFirstInGroup={isFirstInGroup}
          />);
        })}

        {/* Target element for auto-scroll into view on initial load */}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom read-only input indicator */}
      <ReadOnlyInput />
      </>
      )}
    </div>
  );
};

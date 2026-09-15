import { Fragment, useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';

/**
 * Main active chat view component displaying chat header, message list with date dividers,
 * incoming/outgoing message bubbles, and read-only footer input.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Selected chat metadata.
 * @param {string} props.currentUser - Name of the active participant profile.
 * @param {Array<Object>} props.orderedMessages - Chronological array of message items.
 * @param {Function} props.isOutgoingMessage - Function checking if message is outgoing.
 * @param {React.RefObject} props.messagesEndRef - Ref DOM target for auto-scrolling.
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
}
) => {
  const [oldScrollHeight, setOldScrollHeight] = useState(0)
  const [newScrollTop, setNewScrollTop] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const scrollDivContainer = useRef(null)


  useEffect(() => {
    if (isLoadingMore) {
      let heightDifference = scrollDivContainer.current.scrollHeight - oldScrollHeight;
      setIsLoadingMore(false)
      scrollDivContainer.current.scrollTop = heightDifference;

    }
  }, [messages])



  const handleScroll = (event) => {

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget


    if (scrollTop === 0) {
      setOldScrollHeight(scrollHeight)
      setIsLoadingMore(true)
      loadMore(selectedChat.id)
    }
  }


  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
      {/* Top sticky chat header */}
      <ChatHeader selectedChat={selectedChat} currentUser={currentUser} />


      {/* Scrollable messages container with subtle background pattern */}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
        onScroll={handleScroll}
        ref={scrollDivContainer}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}

      >
        {hasMore && <div className='flex justify-center mb-1'>
          <button className='border p-1'
            onClick={() => {
              loadMore(selectedChat.id)
            }}
          >Load More</button>
        </div>}
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
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'
                  } w-full`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow ${isOutgoing
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

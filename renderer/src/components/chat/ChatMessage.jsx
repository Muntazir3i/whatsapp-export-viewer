export const ChatMessage = ({ msg, isOutgoing, showDateDivider, currentDate }) => {
  return (
    <>

      {/* Sticky date section header */}
      {showDateDivider && (
        <div className="flex justify-center my-3">
          <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
            {currentDate}
          </span>
        </div>
      )}

      {/* System Messages & Message Bubble Row Container */}

      {msg.type === "system" ? <div className="flex justify-center my-3">
        <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
          {msg.message}
        </span>
      </div> : <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full`}>
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg px-3 py-1.5 text-sm shadow ${isOutgoing
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
      </div>}


    </>
  )
}

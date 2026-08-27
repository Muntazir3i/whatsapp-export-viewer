import React from 'react'
import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';

export const ChatView = ({selectedChat, currentUser, orderedMessages, isOutgoingMessage, messagesEndRef}) => {
  return (
    <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
    
          <ChatHeader
            selectedChat={selectedChat}
            currentUser={currentUser}
          />
    
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
            style={{
              backgroundImage:
                `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
              backgroundSize: "24px 24px"
            }}
          >
            {orderedMessages.map((msg, index) => {
              const isOutgoing = isOutgoingMessage(msg);
    
              /*
               * Date divider.
               *
               * Your database currently gives us timestamp,
               * so we derive the date from it for now.
               */
              const currentDate = msg.timestamp
                ? msg.timestamp.split(",")[0]
                : null;
    
              const previousDate =
                index > 0 && orderedMessages[index - 1]?.timestamp
                  ? orderedMessages[index - 1].timestamp.split(",")[0]
                  : null;
    
              const showDateDivider =
                currentDate && currentDate !== previousDate;
    
              return (
                <React.Fragment key={msg.id || index}>
    
                  {/* Date */}
                  {showDateDivider && (
                    <div className="flex justify-center my-3">
                      <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
                        {currentDate}
                      </span>
                    </div>
                  )}
    
                  {/* Message */}
                  <div
                    className={`flex ${isOutgoing
                        ? "justify-end"
                        : "justify-start"
                      } w-full`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow ${isOutgoing
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                        }`}
                    >
                      {!isOutgoing && msg.sender && (
                        <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5">
                          {msg.sender}
                        </span>
                      )}
    
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
                </React.Fragment>
              );
            })}
    
            <div ref={messagesEndRef} />
          </div>
    
          <ReadOnlyInput />
        </div>
  )
}

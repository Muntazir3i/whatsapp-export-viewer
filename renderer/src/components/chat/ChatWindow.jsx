import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "../../hooks/useMessages.js";
import { ChatWindowStartup } from "./ChatWindowStartup.jsx";
import { ChatWindowLoading } from "./ChatWindowLoading.jsx";
import { ChatWindowError } from "./ChatWindowError.jsx";
import { ChatHeader } from "./ChatHeader.jsx";
import { ReadOnlyInput } from "./ReadOnlyInput.jsx";
import { NoParticipants } from "./NoParticipants.jsx";
import { SelectParticipant } from "./SelectParticipant.jsx";

export const ChatWindow = ({ selectedChat }) => {
  const selectedChatId = selectedChat?.id;

  const {
    messages = [],
    loading,
    error
  } = useMessages(selectedChatId);

  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  /*
   * Get all unique participants from the messages.
   *
   * Example:
   *
   * [
   *   "Mohammad",
   *   "Ali",
   *   "Ahmed",
   *   "John"
   * ]
   */
  const participants = useMemo(() => {
    const uniqueSenders = new Set();

    messages.forEach((msg) => {
      if (msg.sender) {
        uniqueSenders.add(msg.sender);
      }
    });

    return [...uniqueSenders];
  }, [messages]);

  /*
   * Reset the selected user whenever the user switches chats.
   */
  useEffect(() => {
    setCurrentUser(null);
  }, [selectedChatId]);

  /*
   * We don't need "fromMe" or "isOutgoing".
   *
   * If the sender matches the participant the user selected,
   * the message belongs to the current user.
   */
  const isOutgoingMessage = (msg) => {
    return msg.sender === currentUser;
  };

  /*
   * Keep messages in chronological order.
   *
   * Assuming your database returns them newest-first,
   * toReversed() puts them oldest -> newest.
   *
   * If your database already returns oldest -> newest,
   * remove this.
   */
  const orderedMessages = useMemo(() => {
    return messages.toReversed();
  }, [messages]);

  /*
   * Scroll to the newest message.
   */
  useEffect(() => {
    if (currentUser) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }
  }, [orderedMessages, currentUser]);

  /*
   * No chat selected.
   */
  if (!selectedChatId) {
    return (
      <ChatWindowStartup/>
    );
  }

  /*
   * Loading messages.
   *
   * We still show the chat header because we already know
   * which chat was selected.
   */
  if (loading) {
    return (
    <ChatWindowLoading selectedChat = {selectedChat}/>
    );
  }

  /*
   * Database error.
   */
  if (error) {
    return (
     <ChatWindowError selectedChat = {selectedChat}/>
    );
  }

  /*
   * No participants found.
   */
  if (participants.length === 0) {
    return (
     <NoParticipants selectedChat = {selectedChat}/>
    );
  }

  /*
   * The important part:
   *
   * We don't know who "you" are.
   *
   * So ask the user.
   */
  if (!currentUser) {
    return (
      <SelectParticipant selectedChat = {selectedChat} participants = {participants} setCurrentUser = {setCurrentUser} />
    );
  }

  /*
   * Normal chat view.
   */
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
  );
};



/*
|--------------------------------------------------------------------------
| Read-only input
|--------------------------------------------------------------------------
*/


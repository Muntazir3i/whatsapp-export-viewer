import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "../../hooks/useMessages.js";

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
  if (!selectedChat) {
    return (
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col items-center justify-center bg-[#222e35] border-b-8 border-[#00a884]">
        <div className="text-center p-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111b21] flex items-center justify-center text-[#8696a0] shadow-md">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <h2 className="text-[#e9edef] text-2xl font-light mb-2">
            WhatsApp Export Viewer
          </h2>

          <p className="text-[#8696a0] text-sm max-w-sm leading-relaxed">
            Select a chat from the sidebar to view messages exported
            from your SQLite database.
          </p>
        </div>
      </div>
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
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
        <ChatHeader selectedChat={selectedChat} />

        <div className="flex-1 flex items-center justify-center">
          <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md">
            Loading messages...
          </span>
        </div>
      </div>
    );
  }

  /*
   * Database error.
   */
  if (error) {
    return (
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
        <ChatHeader selectedChat={selectedChat} />

        <div className="flex-1 flex items-center justify-center">
          <span className="bg-[#3b1219] text-red-300 text-xs px-3 py-1.5 rounded-md border border-red-800">
            Error loading messages from database
          </span>
        </div>
      </div>
    );
  }

  /*
   * No participants found.
   */
  if (participants.length === 0) {
    return (
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
        <ChatHeader selectedChat={selectedChat} />

        <div className="flex-1 flex items-center justify-center">
          <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md">
            No participants found in this conversation.
          </span>
        </div>
      </div>
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
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
        <ChatHeader selectedChat={selectedChat} />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#202c33] rounded-lg p-6 shadow-lg">
            <h2 className="text-[#e9edef] text-xl font-medium mb-2">
              Who are you?
            </h2>

            <p className="text-[#8696a0] text-sm mb-6">
              Select your name from the participants in this
              conversation. Your messages will appear on the
              right and everyone else's messages will appear on
              the left.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {participants.map((participant) => (
                <button
                  key={participant}
                  onClick={() =>
                    setCurrentUser(participant)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2a3942] hover:bg-[#374851] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium">
                    {participant
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <span className="text-[#e9edef] text-sm">
                    {participant}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <ReadOnlyInput />
      </div>
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
| Chat Header
|--------------------------------------------------------------------------
*/

const ChatHeader = ({ selectedChat, currentUser }) => {
  return (
    <div className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0 z-10">

      <div className="flex items-center gap-3 min-w-0">

        <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-base flex-shrink-0">
          {selectedChat.name?.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">

          <h2 className="text-[#e9edef] font-medium text-base leading-tight truncate">
            {selectedChat.name}
          </h2>

          <span className="text-[#8696a0] text-xs block truncate">
            {currentUser
              ? `You are ${currentUser}`
              : "SQLite Export Data"}
          </span>

        </div>
      </div>

      <div className="flex items-center gap-4 text-[#aebac1] flex-shrink-0">

        <button
          className="hover:text-[#e9edef] p-1 transition-colors"
          title="Search in chat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        <button
          className="hover:text-[#e9edef] p-1 transition-colors"
          title="Menu"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

      </div>
    </div>
  );
};


/*
|--------------------------------------------------------------------------
| Read-only input
|--------------------------------------------------------------------------
*/

const ReadOnlyInput = () => {
  return (
    <div className="h-16 bg-[#202c33] px-4 flex items-center gap-3 border-t border-[#222d34] flex-shrink-0">
      <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#8696a0] flex items-center justify-between cursor-not-allowed">
        <span className="truncate">
          Export Viewer Mode (Read-only)
        </span>

        <svg
          className="w-4 h-4 text-[#8696a0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
    </div>
  );
};
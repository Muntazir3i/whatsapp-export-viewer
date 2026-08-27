import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "../../hooks/useMessages.js";
import { ChatWindowStartup } from "./ChatWindowStartup.jsx";
import { ChatWindowLoading } from "./ChatWindowLoading.jsx";
import { ChatWindowError } from "./ChatWindowError.jsx";
import { ChatHeader } from "./ChatHeader.jsx";
import { ReadOnlyInput } from "./ReadOnlyInput.jsx";
import { NoParticipants } from "./NoParticipants.jsx";
import { SelectParticipant } from "./SelectParticipant.jsx";
import { ChatView } from "./ChatView.jsx";

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
    <ChatView selectedChat = {selectedChat} currentUser = {currentUser} orderedMessages = {orderedMessages} isOutgoingMessage = {isOutgoingMessage} messagesEndRef = {messagesEndRef} />
  );
};

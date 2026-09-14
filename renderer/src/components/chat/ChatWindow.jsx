import { useMemo, useRef, useState, useEffect } from "react";
import { useMessages } from "../../hooks/useMessages.js";
import { ChatWindowStartup } from "./ChatWindowStartup.jsx";
import { ChatWindowLoading } from "./ChatWindowLoading.jsx";
import { ChatWindowError } from "./ChatWindowError.jsx";
import { NoParticipants } from "./NoParticipants.jsx";
import { SelectParticipant } from "./SelectParticipant.jsx";
import { ChatView } from "./ChatView.jsx";

/**
 * Controller component for managing chat window states.
 * Handles participant set derivation, message ordering, scrolling, and view selection.
 *
 * @component
 * @param {Object} props
 * @param {Object|null} props.selectedChat - Currently selected chat object.
 * @returns {JSX.Element}
 */
export const ChatWindow = ({ selectedChat }) => {
  const selectedChatId = selectedChat?.id;

  // Fetch messages from database for selected chat
  const { messages = [], loading, error, loadMore, hasMore } = useMessages(selectedChatId);


  // Active user selection for outgoing/incoming bubble assignment
  const [currentUser, setCurrentUser] = useState(null);
  
  // Track previous chat ID to reset currentUser synchronously during render when switching chats
  const [prevChatId, setPrevChatId] = useState(selectedChatId);
  if (selectedChatId !== prevChatId) {
    setPrevChatId(selectedChatId);
    setCurrentUser(null);
  }

  // Ref for auto-scrolling to the latest message
  const messagesEndRef = useRef(null);

  /**
   * Derive unique list of participants from message senders.
   */
  const participants = useMemo(() => {
    const uniqueSenders = new Set();
    messages.forEach((msg) => {
      if (msg.sender) {
        uniqueSenders.add(msg.sender);
      }
    });
    return Array.from(uniqueSenders);
  }, [messages]);

  /**
   * Determines if a message is sent by the currently selected user profile.
   * @param {Object} msg - Message object.
   * @returns {boolean}
   */
  const isOutgoingMessage = (msg) => {
    return msg.sender === currentUser;
  };


  /**
   * Auto-scroll to bottom of chat window when messages or selected user changes.
   */
  useEffect(() => {
    if (currentUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentUser]);

  // State 1: Startup view (no chat selected)
  if (!selectedChatId) {
    return <ChatWindowStartup />;
  }

  // State 2: Messages loading
  if (loading) {
    return <ChatWindowLoading selectedChat={selectedChat} />;
  }

  // State 3: Database / loading error
  if (error) {
    return <ChatWindowError selectedChat={selectedChat} />;
  }

  // State 4: No message senders found in chat
  if (participants.length === 0) {
    return <NoParticipants selectedChat={selectedChat} />;
  }

  // State 5: Prompt user to choose their identity in this conversation
  if (!currentUser) {
    return (
      <SelectParticipant
        selectedChat={selectedChat}
        participants={participants}
        setCurrentUser={setCurrentUser}
      />
    );
  }

  // State 6: Main conversation view
  return (
    <ChatView
      selectedChat={selectedChat}
      currentUser={currentUser}
      messages = {messages}
      loadMore = {loadMore}
      hasMore = {hasMore}
      isOutgoingMessage={isOutgoingMessage}
      messagesEndRef={messagesEndRef}
    />
  );
};

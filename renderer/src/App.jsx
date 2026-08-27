import { useState } from 'react';
import './styles/global.css';
import { Sidebar } from './components/Sidebar/Sidebar.jsx';
import { ChatWindow } from './components/chat/ChatWindow.jsx';

/**
 * Main application layout component for the WhatsApp Export Viewer renderer process.
 * Manages global chat selection state and orchestrates Sidebar and ChatWindow components.
 *
 * @component
 * @returns {JSX.Element} The rendered main layout view.
 */
function App() {
  /**
   * Currently selected chat object (e.g., { id, name, lastMessage, timestamp }).
   * Initialized to `null` when no chat is active.
   */
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b141a] text-[#e9edef] antialiased">
      {/* Sidebar listing available chats and search filter */}
      <Sidebar setSelectedChat={setSelectedChat} />

      {/* Main chat window displaying selected chat messages */}
      <ChatWindow selectedChat={selectedChat} />
    </div>
  );
}

export default App;

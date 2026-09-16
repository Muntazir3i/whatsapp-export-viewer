import { useState, useMemo } from 'react';
import { useChats } from '../../hooks/useChats.js';
import { SidebarHeader } from './SidebarHeader.jsx';
import { SidebarSearch } from './SidebarSearch.jsx';
import { SidebarChatlist } from './SidebarChatlist.jsx';
import { deleteChat } from '../../api/electronApi.js';

/**
 * Sidebar component containing header title, search bar, and filtered chat list.
 * Handles automatic list refreshes on chat imports and deletions.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.setSelectedChat - Callback function to update selected chat in parent App state.
 * @returns {JSX.Element}
 */
export const Sidebar = ({ setSelectedChat }) => {
  // Fetch chats asynchronously from SQLite database IPC with refetch handler
  const { chats, loading, error, refetch } = useChats();

  // Local search query state
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Memoized search filtering to prevent recalculating on unrelated parent re-renders.
   * Matches query against chat name and lastMessage content.
   */
  const filteredChats = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return chats;

    return chats.filter((chat) => {
      const nameMatch = chat?.name?.toLowerCase().includes(query) ?? false;
      const msgMatch = chat?.lastMessage?.toLowerCase().includes(query) ?? false;
      return nameMatch || msgMatch;
    });
  }, [chats, searchTerm]);

  /**
   * Deletes a chat by ID via IPC and triggers automatic chat list refetch.
   * @param {number|string} chatId
   */
  async function removeChat(chatId) {
    if (!chatId) return;
    const result = await deleteChat(chatId);
    if (result) {
      refetch();
    }
    return result;
  }

  return (
    <aside
      id="default-sidebar"
      className="fixed top-0 left-0 z-40 w-full sm:w-80 md:w-96 h-full bg-[#111b21] border-r border-[#222d34] flex flex-col transition-transform -translate-x-full sm:translate-x-0"
      aria-label="Sidebar"
    >
      {/* App brand header with Import Chat button */}
      <SidebarHeader onImportSuccess={refetch} />

      {/* Interactive search bar input */}
      <SidebarSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* Scrollable list of filtered chat items */}
      <SidebarChatlist
        loading={loading}
        error={error}
        filteredChats={filteredChats}
        setSelectedChat={setSelectedChat}
        removeChat={removeChat}
      />
    </aside>
  );
};
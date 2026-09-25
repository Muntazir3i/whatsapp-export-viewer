import { useState } from 'react';
import { ContextMenu } from './ContextMenu.jsx';
import { DeleteChatDialog } from './DeleteChatDialog.jsx';

/**
 * Component to render the scrollable list of filtered chats in the sidebar.
 * Displays loading indicators, error notices, empty results, and individual chat items.
 * Supports custom right-click context menu actions (edit, mute, delete).
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.loading - Indicates if chats are currently loading.
 * @param {Error|null} props.error - Error object if loading chats failed.
 * @param {Array<Object>} props.filteredChats - List of chats matching current filter.
 * @param {Function} props.setSelectedChat - Callback to select a chat.
 * @param {Function} [props.removeChat] - Callback to delete a chat by ID.
 * @returns {JSX.Element}
 */
export const SidebarChatlist = ({
  loading,
  error,
  filteredChats,
  setSelectedChat,
  removeChat,
}) => {
  // Context menu position and target chat state
  const [contextMenu, setContextMenu] = useState(null);

  // Target chat object pending confirmation in DeleteChatDialog modal
  const [chatToDelete, setChatToDelete] = useState(null);

  /**
   * Opens custom context menu at right-click cursor position.
   * @param {React.MouseEvent} e
   * @param {Object} chat
   */
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chat,
    });
  };

  /**
   * Opens delete confirmation modal dialog when user selects delete from context menu.
   * @param {Object} chat
   */
  const handleDelete = (chat) => {
    setChatToDelete(chat);
  };

  /**
   * Confirms and executes chat deletion API callback.
   * @param {Object} chat
   */
  const handleConfirmDelete = async (chat) => {
    try {
      if (removeChat) {
        const result = await removeChat(chat.id);
        console.log('[SidebarChatlist] Chat deleted:', result);
      }
    } catch (err) {
      console.error('[SidebarChatlist] Error deleting chat:', err);
    }
  };

  /**
   * Handler for editing chat name context menu action.
   * @param {Object} chat
   */
  const handleEditName = (chat) => {
    console.log('[SidebarChatlist] Edit name requested for:', chat);
    // Future modal or inline rename handler hook
  };

  /**
   * Handler for muting notifications context menu action.
   * @param {Object} chat
   */
  const handleMute = (chat) => {
    console.log('[SidebarChatlist] Mute notifications requested for:', chat);
    // Future mute toggle handler hook
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Loading state indicator */}
      {loading && (
        <div className="p-4 text-center text-[#8696a0] text-sm">
          Loading chats...
        </div>
      )}

      {/* Error notice */}
      {error && (
        <div className="p-4 text-center text-red-400 text-sm">
          Failed to load chats
        </div>
      )}

      {/* List of active chats */}
      {!loading && !error && filteredChats.length > 0 && (
        filteredChats.map((chat, index) => (
          <div
            key={chat.id ?? chat.name ?? index}
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors focus:outline-none focus:bg-[#202c33] select-none"
            onClick={() => setSelectedChat(chat)}
            onContextMenu={(e) => handleContextMenu(e, chat)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedChat(chat);
              }
            }}
          >
            {/* Avatar with fallback initial letter */}
            <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
              {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
            </div>

            {/* Chat details preview */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-[#e9edef] font-medium text-base truncate">
                  {chat.name}
                </h3>
                {chat.timestamp && (
                  <span className="text-[#8696a0] text-xs flex-shrink-0 ml-2">
                    {chat.timestamp}
                  </span>
                )}
              </div>
              <p className="text-[#8696a0] text-sm truncate text-left">
                {chat.lastMessage}
              </p>
            </div>
          </div>
        ))
      )}

      {/* Empty state when query matches no chats */}
      {!loading && !error && filteredChats.length === 0 && (
        <div className="p-4 text-center text-[#8696a0] text-sm">
          No chats found
        </div>
      )}

      {/* Dynamic Context Menu overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          chat={contextMenu.chat}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onEditName={handleEditName}
          onMute={handleMute}
        />
      )}

      {/* Delete Chat confirmation dialog modal */}
      {chatToDelete && (
        <DeleteChatDialog
          chat={chatToDelete}
          onConfirm={handleConfirmDelete}
          onClose={() => setChatToDelete(null)}
        />
      )}
    </div>
  );
};
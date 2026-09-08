import { useEffect, useRef } from 'react';

/**
 * Context menu component rendered at cursor coordinates on right-click over a chat item.
 * Supports positioning adjustments to prevent viewport overflow, backdrop click-to-close,
 * and keyboard (Escape) dismissal.
 *
 * @component
 * @param {Object} props
 * @param {number} props.x - Cursor X coordinate.
 * @param {number} props.y - Cursor Y coordinate.
 * @param {Object} props.chat - Selected chat object for context actions.
 * @param {Function} props.onClose - Callback function to close the menu.
 * @param {Function} props.onDelete - Callback to delete the selected chat.
 * @param {Function} props.onEditName - Callback to edit the selected chat name.
 * @param {Function} props.onMute - Callback to mute notifications for the chat.
 * @returns {JSX.Element}
 */
export const ContextMenu = ({ x, y, chat, onClose, onDelete, onEditName, onMute }) => {
  const menuRef = useRef(null);

  // Close context menu when clicking outside or pressing Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport boundary collision prevention calculations
  const menuWidth = 190;
  const menuHeight = 160;
  const adjustedX = window.innerWidth - x < menuWidth ? x - menuWidth : x;
  const adjustedY = window.innerHeight - y < menuHeight ? y - menuHeight : y;

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-48 bg-[#233138] rounded-lg shadow-xl border border-[#222d34]/60 py-1.5 text-[#d1d7db] text-sm select-none animate-in fade-in duration-100"
      role="menu"
      aria-label="Chat Context Menu"
    >
      {/* Action 1: Edit Chat Name */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onEditName(chat);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-[#182229] flex items-center gap-3 transition-colors focus:outline-none focus:bg-[#182229]"
      >
        <svg
          className="w-4 h-4 text-[#8696a0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edit Name
      </button>

      {/* Action 2: Mute Notifications */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onMute(chat);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-[#182229] flex items-center gap-3 transition-colors focus:outline-none focus:bg-[#182229]"
      >
        <svg
          className="w-4 h-4 text-[#8696a0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        Mute Notifications
      </button>

      <div className="my-1 border-t border-[#222d34]" />

      {/* Action 3: Delete Chat */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDelete(chat);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-[#182229] text-red-400 flex items-center gap-3 transition-colors focus:outline-none focus:bg-[#182229]"
      >
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Chat
      </button>
    </div>
  );
};
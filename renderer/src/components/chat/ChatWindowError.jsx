import { ChatHeader } from './ChatHeader.jsx';

/**
 * Fallback component displayed when fetching messages from SQLite fails.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Currently selected chat object.
 * @returns {JSX.Element}
 */
export const ChatWindowError = ({ selectedChat }) => {
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
};

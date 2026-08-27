import { ChatHeader } from './ChatHeader.jsx';

/**
 * Placeholder view displayed when a selected chat contains 0 message senders.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Currently selected chat object.
 * @returns {JSX.Element}
 */
export const NoParticipants = ({ selectedChat }) => {
  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
      <ChatHeader selectedChat={selectedChat} />

      <div className="flex-1 flex items-center justify-center">
        <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md">
          No participants found in this conversation.
        </span>
      </div>
    </div>
  );
};

/**
 * Header component for active chat window displaying conversation name, active user identity,
 * and standard action icons.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Details of current selected chat.
 * @param {string|null} [props.currentUser] - Name of currently selected active participant.
 * @param {Function} [props.onOpenInfo] - Opens the chat info panel when the header profile is clicked.
 * @returns {JSX.Element}
 */
export const ChatHeader = ({ selectedChat, currentUser, onOpenInfo }) => {
  const chatName = selectedChat?.name || 'Chat';
  const initialLetter = chatName.charAt(0).toUpperCase();

  return (
    <div className="h-[59px] bg-[#202c33] px-4 flex items-center justify-between flex-shrink-0 z-10">
      {/* Left section: Avatar & Chat Info (opens chat info) */}
      <button
        type="button"
        onClick={onOpenInfo}
        title="Chat info"
        aria-label="Open chat info"
        className="flex items-center gap-3 min-w-0 -ml-1 rounded-md px-1 py-1 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
      >
        <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-base flex-shrink-0">
          {initialLetter}
        </div>

        <div className="min-w-0">
          <h2 className="text-[#e9edef] text-[16px] leading-tight truncate">
            {chatName}
          </h2>

          <span className="text-[#8696a0] text-[13px] block truncate">
            {currentUser ? `You are ${currentUser}` : 'Read-only export'}
          </span>
        </div>
      </button>

      {/* Right section: Action Buttons */}
      <div className="flex items-center gap-1 text-[#aebac1] flex-shrink-0">
        <button
          type="button"
          className="p-2 rounded-full hover:bg-white/5 hover:text-[#e9edef] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
          title="Search in chat"
          aria-label="Search in chat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          type="button"
          className="p-2 rounded-full hover:bg-white/5 hover:text-[#e9edef] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
          title="Menu options"
          aria-label="Menu options"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

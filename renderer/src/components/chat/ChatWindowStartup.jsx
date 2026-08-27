/**
 * Initial empty state view displayed when no conversation is selected from the sidebar.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ChatWindowStartup = () => {
  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col items-center justify-center bg-[#222e35] border-b-8 border-[#00a884]">
      <div className="text-center p-6">
        {/* Placeholder Chat Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111b21] flex items-center justify-center text-[#8696a0] shadow-md">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          Select a chat from the sidebar to view messages exported from your SQLite database.
        </p>
      </div>
    </div>
  );
};

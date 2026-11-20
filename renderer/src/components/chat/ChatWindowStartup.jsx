/**
 * Initial empty state view displayed when no conversation is selected from the sidebar.
 * Mirrors the WhatsApp Web landing screen.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ChatWindowStartup = () => {
  return (
    <div className="w-full sm:ml-[340px] md:ml-[clamp(340px,30%,420px)] h-screen flex flex-col items-center justify-center bg-[#222e35] border-b-[6px] border-[#00a884]">
      <div className="text-center p-8 max-w-md">
        {/* Chat illustration */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#111b21] flex items-center justify-center text-[#8696a0] shadow-md">
          <svg
            className="w-12 h-12"
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

        <h1 className="text-[#e9edef] text-[30px] font-light tracking-tight mb-3">
          WhatsApp Export Viewer
        </h1>

        <p className="text-[#8696a0] text-[14px] leading-[20px]">
          Select a chat from the sidebar to read your exported conversation.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-[#8696a0] text-[13px]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>

          Your messages stay on this device.
        </div>
      </div>
    </div>
  );
};

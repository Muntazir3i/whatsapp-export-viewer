/**
 * Bottom footer bar styled like the WhatsApp composer, indicating read-only mode.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ReadOnlyInput = () => {
  return (
    <div className="h-[62px] bg-[#202c33] px-4 flex items-center gap-2 flex-shrink-0">
      {/* Left-side composer icons (inert in view mode) */}
      <div className="flex items-center gap-1 text-[#8696a0]" aria-hidden="true">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 5v14M5 12h14"
          />
        </svg>

        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M15.5 8.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 21a9 9 0 100-18 9 9 0 000 18z"
          />
        </svg>
      </div>

      {/* Message input placeholder */}
      <div className="flex-1 h-10 bg-[#2a3942] rounded-lg px-3 flex items-center justify-between text-[#8696a0] cursor-not-allowed">
        <span className="text-[15px] truncate">Read-only export</span>

        <svg
          className="w-4 h-4 flex-shrink-0"
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
      </div>

      {/* Right-side mic icon (inert in view mode) */}
      <svg
        className="w-6 h-6 text-[#8696a0]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 11a7 7 0 0014 0M12 18v3"
        />
      </svg>
    </div>
  );
};

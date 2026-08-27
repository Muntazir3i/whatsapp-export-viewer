/**
 * Bottom footer bar component indicating read-only mode for exported chat viewer.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ReadOnlyInput = () => {
  return (
    <div className="h-16 bg-[#202c33] px-4 flex items-center gap-3 border-t border-[#222d34] flex-shrink-0">
      <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#8696a0] flex items-center justify-between cursor-not-allowed">
        <span className="truncate">Export Viewer Mode (Read-only)</span>

        {/* Lock Icon */}
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
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
    </div>
  );
};

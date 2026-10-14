/**
 * Search bar component for filtering chats in the sidebar.
 *
 * @component
 * @param {Object} props
 * @param {string} props.searchTerm - Current filter search term.
 * @param {Function} props.setSearchTerm - State setter function for search term.
 * @returns {JSX.Element}
 */
export const SidebarSearch = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="p-2 bg-[#111b21] flex-shrink-0">
      <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
        {/* Search icon */}
        <svg
          className="w-4 h-4 text-[#8696a0] mr-3 flex-shrink-0"
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

        {/* Input field */}
        <input
          type="text"
          placeholder="Search Chat"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] text-sm focus:outline-none"
          aria-label="Search chats"
        />

        {/* Clear search query button */}
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-[#8696a0] hover:text-[#e9edef] text-xs ml-1 focus:outline-none"
            aria-label="Clear search input"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

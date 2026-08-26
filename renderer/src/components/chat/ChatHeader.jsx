import React from 'react'

export const ChatHeader = ({ selectedChat, currentUser }) => {
  return (
    <div className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0 z-10">

      <div className="flex items-center gap-3 min-w-0">

        <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-base flex-shrink-0">
          {selectedChat.name?.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">

          <h2 className="text-[#e9edef] font-medium text-base leading-tight truncate">
            {selectedChat.name}
          </h2>

          <span className="text-[#8696a0] text-xs block truncate">
            {currentUser
              ? `You are ${currentUser}`
              : "SQLite Export Data"}
          </span>

        </div>
      </div>

      <div className="flex items-center gap-4 text-[#aebac1] flex-shrink-0">

        <button
          className="hover:text-[#e9edef] p-1 transition-colors"
          title="Search in chat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
          className="hover:text-[#e9edef] p-1 transition-colors"
          title="Menu"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

      </div>
    </div>
  )
}

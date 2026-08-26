import React from 'react'

export const ChatWindowLoading = () => {
  return (
      <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
        <ChatHeader selectedChat={selectedChat} />

        <div className="flex-1 flex items-center justify-center">
          <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md">
            Loading messages...
          </span>
        </div>
      </div>
  )
}

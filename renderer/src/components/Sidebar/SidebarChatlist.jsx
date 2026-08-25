import React from 'react'
import { useState } from 'react'



export const SidebarChatlist = ({ loading, error, filteredChats, setSelectedChat }) => {
    
    return (
        <div className="flex-1 overflow-y-auto">
            {loading && (
                <div className="p-4 text-center text-[#8696a0] text-sm">
                    Loading chats...
                </div>
            )}

            {error && (
                <div className="p-4 text-center text-red-400 text-sm">
                    Failed to load chats
                </div>
            )}

            {!loading && !error && filteredChats.length > 0 && (
                filteredChats.map((chat) => (
                    <div
                        key={chat.id || chat.name}
                        className="flex items-center gap-3 px-4 py-3  hover:bg-[#202c33] cursor-pointer transition-colors"
                        onClick={() => {
                            setSelectedChat(chat)
                        }}
                    >
                        {/*fallback initial */}
                        <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
                            {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
                        </div>


                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="text-[#e9edef] font-medium text-base truncate">
                                    {chat.name}
                                </h3>
                                <span className="text-[#8696a0] text-xs flex-shrink-0 ml-2">
                                    {chat.timestamp}
                                </span>
                            </div>
                            <p className="text-[#8696a0] text-sm truncate text-left">
                                {chat.lastMessage}
                            </p>
                        </div>
                    </div>
                ))
            )}

            {!loading && !error && filteredChats.length === 0 && (
                <div className="p-4 text-center text-[#8696a0] text-sm">
                    No chats found
                </div>
            )}
        </div>
    )
}

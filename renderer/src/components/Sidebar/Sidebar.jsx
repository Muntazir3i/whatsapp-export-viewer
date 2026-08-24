import React, { useState } from 'react';
import { useChats } from '../../hooks/useChats.js';

export const Sidebar = () => {
    const { chats, loading, error } = useChats();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChats = chats.filter((chat) => {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = chat?.name?.toLowerCase().includes(query) ?? false;
        const msgMatch = chat?.lastMessage?.toLowerCase().includes(query) ?? false;
        return nameMatch || msgMatch;
    });

    return (
        <aside 
            id="default-sidebar" 
            className="fixed top-0 left-0 z-40 w-full sm:w-80 md:w-96 h-full bg-[#111b21] border-r border-[#222d34] flex flex-col transition-transform -translate-x-full sm:translate-x-0" 
            aria-label="Sidebar"
        >
            {/* Top Desktop-style Header */}
            <div className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className='text-white font-bold'>WhatsApp Export Viewer</span>
                </div>
            </div>

            {/* Search Header */}
            <div className="p-2 bg-[#111b21] flex-shrink-0">
                <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
                    <svg className="w-4 h-4 text-[#8696a0] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] text-sm focus:outline-none"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="text-[#8696a0] hover:text-[#e9edef] text-xs ml-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Chat List Scrollable Container */}
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
        </aside>
    );
};
import React, { useState } from 'react';
import { useChats } from '../../hooks/useChats.js';
import { SidebarHeader} from './SidebarHeader.jsx';
import { SidebarSearch } from './SidebarSearch.jsx';
import { SidebarChatlist } from './SidebarChatlist.jsx';

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
            <SidebarHeader/>
            {/* Search Header */}
            <SidebarSearch searchTerm = {searchTerm} setSearchTerm = {setSearchTerm}/>
            {/* Chat List Scrollable Container */}
            <SidebarChatlist loading = {loading} error = {error} filteredChats = {filteredChats}/>
            
        </aside>
    );
};
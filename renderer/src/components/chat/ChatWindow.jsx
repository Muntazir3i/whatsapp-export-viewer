import React, { useRef, useEffect } from "react";
import { useMessages } from "../../hooks/useMessages.js";

export const ChatWindow = ({ selectedChatId }) => {
    // Fetch messages using selectedChatId prop
    const { messages = [], loading, error } = useMessages(selectedChatId);
    const messagesEndRef = useRef(null);

    // Auto scroll to bottom when new chat is selected or messages load
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedChatId]);

    // 1. Placeholder state when no chat is selected from the sidebar
    if (!selectedChatId) {
        return (
            <div className="sm:ml-80 md:ml-96 h-screen flex flex-col items-center justify-center bg-[#222e35] border-b-8 border-[#00a884] selection:bg-none">
                <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111b21] flex items-center justify-center text-[#8696a0] shadow-md">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h2 className="text-[#e9edef] text-2xl font-light mb-2">WhatsApp Export Viewer</h2>
                    <p className="text-[#8696a0] text-sm max-w-sm leading-relaxed">
                        Select a chat from the sidebar to view messages exported from your SQLite database.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
            {/* 2. Top Navigation / Chat Header */}
            <div className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium text-base flex-shrink-0">
                        {selectedChatId.toString().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[#e9edef] font-medium text-base leading-tight truncate">
                            Chat #{selectedChatId}
                        </h2>
                        <span className="text-[#8696a0] text-xs block truncate">
                            SQLite Export Data
                        </span>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-4 text-[#aebac1] flex-shrink-0">
                    <button className="hover:text-[#e9edef] p-1 transition-colors" title="Search in chat">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button className="hover:text-[#e9edef] p-1 transition-colors" title="Menu">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 3. Messages View Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }}
            >
                {loading && (
                    <div className="flex justify-center items-center h-full">
                        <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md shadow-sm">
                            Loading messages...
                        </span>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center items-center h-full">
                        <span className="bg-[#3b1219] text-red-300 text-xs px-3 py-1.5 rounded-md border border-red-800">
                            Error loading messages from database
                        </span>
                    </div>
                )}

                {!loading && !error && messages.length === 0 && (
                    <div className="flex justify-center items-center h-full">
                        <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md">
                            No messages in this conversation.
                        </span>
                    </div>
                )}

                {!loading && !error && messages.map((msg, index) => {
                    const isOutgoing = msg.fromMe || msg.isOutgoing || msg.sender === 'You' || msg.sender === ' You';
                    const showDateDivider = index === 0 || (messages[index - 1]?.date !== msg.date);

                    return (
                        <React.Fragment key={msg.id || index}>
                            {/* Date Group Divider */}
                            {msg.date && showDateDivider && (
                                <div className="flex justify-center my-3">
                                    <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
                                        {msg.timestamp}
                                    </span>
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full`}>
                                <div
                                    className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow ${
                                        isOutgoing
                                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                                            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                    }`}
                                >
                                    {!isOutgoing && msg.sender && (
                                        <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5">
                                            {msg.sender}
                                        </span>
                                    )}

                                    <p className="whitespace-pre-wrap break-words pb-3 pr-2 leading-relaxed">
                                        {msg.message}
                                    </p>

                                    <div className="absolute bottom-1 right-2 flex items-center gap-4 text-[10px] text-[#8696a0]">
                                        <span>{msg.timestamp || msg.time}</span>
              
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>

            {/* 4. Bottom Read-Only Input Bar */}
            <div className="h-16 bg-[#202c33] px-4 flex items-center gap-3 border-t border-[#222d34] flex-shrink-0">
                <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#8696a0] flex items-center justify-between cursor-not-allowed">
                    <span className="truncate">Export Viewer Mode (Read-only)</span>
                    <svg className="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
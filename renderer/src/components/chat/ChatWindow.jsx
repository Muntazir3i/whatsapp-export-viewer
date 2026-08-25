import React, { useEffect } from 'react';

// Mock chat data matching WhatsApp Web UI
const MOCK_MESSAGES = [
  {
    id: 1,
    sender: 'Suhaib Bhai Jio',
    text: 'Did you see that link?',
    timestamp: '1:04 am',
    isOutgoing: false,
    date: 'Yesterday'
  },
  {
    id: 2,
    sender: 'You',
    text: 'Checking now...',
    timestamp: '1:05 am',
    isOutgoing: true,
    reactions: ['👍', '😂'],
    url: 'https://www.instagram.com/p/Example/',
    date: 'Today'
  },
  {
    id: 3,
    sender: 'You',
    text: "That's wild!",
    timestamp: '1:06 am',
    isOutgoing: true,
    date: 'Today'
  }
];

export const ChatWindow = ({ activeChat, selectedChatId}) => {

  useEffect(()=>{
    console.log(selectedChatId);
    
  },[selectedChatId])


  return (
    <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a] overflow-hidden">
      {/* 1. Header */}
      <div className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-semibold flex-shrink-0">
            {activeChat?.name ? activeChat.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="min-w-0">
            <h2 className="text-[#e9edef] font-medium text-base leading-tight truncate">
              {activeChat?.name || 'Suhaib Bhai Jio'}
            </h2>
            <span className="text-[#8696a0] text-xs block truncate">
              click here for contact info
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#aebac1] flex-shrink-0">
          <button className="hover:text-[#e9edef] p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="hover:text-[#e9edef] p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4zm0 7a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Chat Messages View (Overflow Container) */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      >
        {MOCK_MESSAGES.map((msg, index) => {
          const showDateDivider = index === 0 || MOCK_MESSAGES[index - 1].date !== msg.date;

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="flex justify-center my-3">
                  <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
                    {msg.date}
                  </span>
                </div>
              )}

              <div className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'} w-full`}>
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow ${
                    msg.isOutgoing 
                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                      : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words pb-3 pr-2">
                    {msg.text}
                  </p>

                  {msg.url && (
                    <a
                      href={msg.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-[#53bdeb] underline truncate mb-3"
                    >
                      {msg.url}
                    </a>
                  )}

                  <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-[#8696a0]">
                    <span>{msg.timestamp}</span>
                    {msg.isOutgoing && (
                      <span className="text-[#53bdeb]">✓✓</span>
                    )}
                  </div>

                  {msg.reactions && (
                    <div className="absolute -bottom-2.5 left-2 bg-[#182229] border border-[#222d34] px-1.5 py-0.5 rounded-full flex gap-1 text-xs shadow-md">
                      {msg.reactions.map((emoji, i) => (
                        <span key={i}>{emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. Footer / Input (Disabled View Mode) */}
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
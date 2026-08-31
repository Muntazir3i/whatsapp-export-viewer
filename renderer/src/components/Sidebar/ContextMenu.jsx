import React, { useEffect, useRef } from 'react';

export const ContextMenu = ({ x, y, chat, onClose, onDelete, onEditName, onMute }) => {
    const menuRef = useRef(null);

    // Close menu when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Prevent menu from overflowing the screen boundary
    const menuWidth = 190;
    const menuHeight = 160;
    const adjustedX = window.innerWidth - x < menuWidth ? x - menuWidth : x;
    const adjustedY = window.innerHeight - y < menuHeight ? y - menuHeight : y;

    return (
        <div
            ref={menuRef}
            style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
            className="fixed z-50 w-48 bg-[#233138] rounded-lg shadow-xl border border-[#222d34]/60 py-1.5 text-[#d1d7db] text-sm select-none animate-in fade-in duration-100"
        >
            <button
                onClick={() => { onEditName(chat); onClose(); }}
                className="w-full text-left px-4 py-2 hover:bg-[#182229] flex items-center gap-3 transition-colors"
            >
                <svg className="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Name
            </button>

            <button
                onClick={() => { onMute(chat); onClose(); }}
                className="w-full text-left px-4 py-2 hover:bg-[#182229] flex items-center gap-3 transition-colors"
            >
                <svg className="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Mute Notifications
            </button>

            <div className="my-1 border-t border-[#222d34]" />

            <button
                onClick={() => { onDelete(chat); onClose(); }}
                className="w-full text-left px-4 py-2 hover:bg-[#182229] text-red-400 flex items-center gap-3 transition-colors"
            >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Chat
            </button>
        </div>
    );
};
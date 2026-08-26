import React from 'react'
import { ChatHeader } from './ChatHeader.jsx'
import { ReadOnlyInput } from './ReadOnlyInput'

export const SelectParticipant = ({selectedChat, participants, setCurrentUser}) => {
  return (
    <div className="sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
            <ChatHeader selectedChat={selectedChat} />
    
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-[#202c33] rounded-lg p-6 shadow-lg">
                <h2 className="text-[#e9edef] text-xl font-medium mb-2">
                  Who are you?
                </h2>
    
                <p className="text-[#8696a0] text-sm mb-6">
                  Select your name from the participants in this
                  conversation. Your messages will appear on the
                  right and everyone else's messages will appear on
                  the left.
                </p>
    
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {participants.map((participant) => (
                    <button
                      key={participant}
                      onClick={() =>
                        setCurrentUser(participant)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2a3942] hover:bg-[#374851] transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium">
                        {participant
                          .charAt(0)
                          .toUpperCase()}
                      </div>
    
                      <span className="text-[#e9edef] text-sm">
                        {participant}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
    
            <ReadOnlyInput />
          </div>
  )
}

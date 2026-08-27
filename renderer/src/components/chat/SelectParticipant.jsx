import { ChatHeader } from './ChatHeader.jsx';
import { ReadOnlyInput } from './ReadOnlyInput.jsx';

/**
 * Modal-style participant selection screen asking the user to choose their identity
 * in the current chat session to distinguish outgoing (right-aligned) vs incoming (left-aligned) messages.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Currently selected chat object.
 * @param {Array<string>} props.participants - Unique list of message senders in this chat.
 * @param {Function} props.setCurrentUser - Setter function to update the active user profile name.
 * @returns {JSX.Element}
 */
export const SelectParticipant = ({
  selectedChat,
  participants,
  setCurrentUser,
}) => {
  return (
    <div className="w-full sm:ml-80 md:ml-96 h-screen flex flex-col bg-[#0b141a]">
      <ChatHeader selectedChat={selectedChat} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#202c33] rounded-lg p-6 shadow-lg border border-[#222d34]">
          <h2 className="text-[#e9edef] text-xl font-medium mb-2">
            Who are you?
          </h2>

          <p className="text-[#8696a0] text-sm mb-6 leading-relaxed">
            Select your name from the participants in this conversation. Your messages
            will appear on the right and everyone else's messages will appear on the left.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {participants.map((participant) => (
              <button
                type="button"
                key={participant}
                onClick={() => setCurrentUser(participant)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2a3942] hover:bg-[#374851] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              >
                <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-medium flex-shrink-0">
                  {participant.charAt(0).toUpperCase()}
                </div>

                <span className="text-[#e9edef] text-sm font-medium truncate">
                  {participant}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ReadOnlyInput />
    </div>
  );
};

import { useState } from "react";

export const ChatExistDialog = ({ setExist, onRename }) => {
  const [rename, setRename] = useState(false);
  const [newName, setNewName] = useState("");

  const handleClose = () => {
    setRename(false);
    setNewName("");
    setExist(false);
  };

  const handleRename = () => {
    const trimmedName = newName.trim();

    if (!trimmedName) return;

    // For now, just send the value back to the parent.
    setNewName(trimmedName)
  
    setExist(false);

    handleClose()
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-exists-title"
    >
      <div className="w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#2a3942] bg-[#202c33] shadow-2xl">
        {/* Dialog Header */}
        <div className="flex items-center justify-between border-b border-[#2a3942] px-5 py-4">
          <h2
            id="chat-exists-title"
            className="text-base font-semibold text-[#e9edef]"
          >
            Chat Already Exists
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        {/* Dialog Body */}
        <div className="px-5 py-5">
          {!rename ? (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2a3942]">
                  <svg
                    className="h-5 w-5 text-[#00a884]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000-18z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm leading-5 text-[#e9edef]">
                    This chat has already been imported.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#8696a0]">
                    You can keep the existing chat or import this chat with a
                    different name.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <label
                htmlFor="chat-rename"
                className="block text-sm font-medium text-[#e9edef]"
              >
                Enter a new chat name
              </label>

              <input
                id="chat-rename"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Family Chat"
                autoFocus
                className="mt-2 w-full rounded-md border border-[#2a3942] bg-[#111b21] px-3 py-2 text-sm text-[#e9edef] outline-none placeholder:text-[#667781] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]"
              />

              <p className="mt-2 text-xs text-[#8696a0]">
                This name will be used for the imported chat.
              </p>
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end gap-2 border-t border-[#2a3942] px-5 py-3">
          {!rename ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef]"
              >
                Keep Existing
              </button>

              <button
                type="button"
                onClick={() => setRename(true)}
                className="rounded-md bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#008f70]"
              >
                Rename
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setRename(false);
                  setNewName("");
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef]"
              >
                Back
              </button>

              <button
                type="button"
                disabled={!newName.trim()}
                onClick={handleRename}
                className="rounded-md bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#008f70] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
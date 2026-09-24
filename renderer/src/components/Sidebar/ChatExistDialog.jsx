import { useState } from "react";
import { importChatWithName } from "../../api/electronApi.js";

/**
 * Modal dialog displayed when an imported chat session already exists in the database.
 * Prompts the user to either keep the existing chat or rename and import under a new name.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.setExist - Callback to update existence dialog visibility state in parent component.
 * @param {string} props.path - File path of the selected WhatsApp export file.
 * @param {Function} [props.onImportSuccess] - Optional callback triggered after successful import to refetch chat list.
 * @returns {JSX.Element}
 */
export const ChatExistDialog = ({ setExist, path, onImportSuccess }) => {
  // Local state to toggle between duplicate warning view and new name input view
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Resets local modal state and closes the existence dialog.
   */
  const handleClose = () => {
    setIsRenaming(false);
    setNewName("");
    setIsSubmitting(false);
    setExist(false);
  };

  /**
   * Triggers the custom-named chat import via IPC bridge and refreshes parent chat list on success.
   */
  const handleRename = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await importChatWithName(path, trimmedName);
      console.log("[ChatExistDialog] Rename import result:", result);

      if (result?.success) {
        // Trigger parent chat list refetch to re-render newly added chat
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else if (result?.error) {
        console.error("[ChatExistDialog] Import failed:", result.error);
      }
    } catch (error) {
      console.error("[ChatExistDialog] Unexpected error during rename import:", error);
    } finally {
      handleClose();
    }
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
          {!isRenaming ? (
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
          ) : (
            <div>
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
                disabled={isSubmitting}
                className="mt-2 w-full rounded-md border border-[#2a3942] bg-[#111b21] px-3 py-2 text-sm text-[#e9edef] outline-none placeholder:text-[#667781] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-[#8696a0]">
                This name will be used for the imported chat.
              </p>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end gap-2 border-t border-[#2a3942] px-5 py-3">
          {!isRenaming ? (
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
                onClick={() => setIsRenaming(true)}
                className="rounded-md bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#008f70]"
              >
                Rename
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsRenaming(false);
                  setNewName("");
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef] disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={!newName.trim() || isSubmitting}
                onClick={handleRename}
                className="rounded-md bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#008f70] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Importing..." : "Continue"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
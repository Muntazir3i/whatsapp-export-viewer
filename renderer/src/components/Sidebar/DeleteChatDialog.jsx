import { useEffect, useState } from 'react';

/**
 * Modal confirmation dialog for deleting a chat session.
 * Prompts the user to confirm deletion before calling the removal handler.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.chat - The chat object scheduled for deletion.
 * @param {Function} props.onConfirm - Callback triggered when the user confirms deletion.
 * @param {Function} props.onClose - Callback to close/cancel the dialog.
 * @returns {JSX.Element|null}
 */
export const DeleteChatDialog = ({ chat, onConfirm, onClose }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  if (!chat) return null;

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(chat);
    } catch (err) {
      console.error('[DeleteChatDialog] Error confirming delete:', err);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-chat-title"
    >
      <div className="w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#2a3942] bg-[#202c33] shadow-2xl overflow-hidden">
        {/* Dialog Header */}
        <div className="flex items-center justify-between border-b border-[#2a3942] px-5 py-4">
          <h2
            id="delete-chat-title"
            className="text-base font-semibold text-[#e9edef]"
          >
            Delete Chat
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884] disabled:opacity-50"
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
          <div className="flex items-start gap-3">
            {/* Warning Trash Icon Badge */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-medium leading-5 text-[#e9edef]">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-white">"{chat.name}"</span>?
              </p>

              <p className="mt-1.5 text-xs leading-5 text-[#8696a0]">
                This will permanently delete this chat and all of its messages from your database. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end gap-2 border-t border-[#2a3942] px-5 py-3 bg-[#111b21]/50">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-[#8696a0] transition-colors hover:bg-[#2a3942] hover:text-[#e9edef] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Chat</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

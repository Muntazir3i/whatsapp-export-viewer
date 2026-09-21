import { useState } from "react";
import { importChat } from "../../api/electronApi.js";
import { ImportingDialog } from "./ImportingDialog.jsx";

/**
 * Top title bar component displayed above the sidebar chat list.
 *
 * @component
 * @param {Object} props
 * @param {Function} [props.onImportSuccess] - Optional callback triggered when a chat import completes successfully.
 * @returns {JSX.Element}
 */
export const SidebarHeader = ({ onImportSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [exist, setExist] = useState(false);

  /**
   * Triggers native file dialog import pipeline and refreshes chat list on success.
   */
  const handleImport = async () => {
    if (isImporting) return;

    setExist(false);
    setIsImporting(true);

    try {
      const result = await importChat();

      setExist(result?.exist ?? false);

      if (result?.success) {
        console.log(
          "[SidebarHeader] Chat imported successfully:",
          result.filePath
        );

        if (onImportSuccess) {
          onImportSuccess();
        }
      } else if (result?.canceled) {
        console.log(
          "[SidebarHeader] Import file selection canceled by user."
        );
      } else if (result?.error) {
        console.error("[SidebarHeader] Import failed:", result.error);
      }
    } catch (err) {
      console.error("[SidebarHeader] Unexpected import error:", err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* Sidebar Header */}
      <header className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* App Title */}
          <h1 className="text-[#e9edef] font-bold text-base tracking-wide truncate mr-2">
            WhatsApp Viewer
          </h1>

          {/* Import Button */}
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            title="Import WhatsApp Export (.zip or .txt)"
            aria-label="Import WhatsApp Export Chat File"
            className="bg-[#00a884] hover:bg-[#008f70] active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow transition-all duration-150 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          >
            {isImporting ? (
              <>
                <svg
                  className="animate-spin w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>

                <span>Importing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>

                <span>Import Chat</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Importing Dialog */}
      {isImporting && (<ImportingDialog />)}

      {/* Chat Already Exists Dialog */}
      {exist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-exists-title"
        >
          <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#2a3942] bg-[#202c33] shadow-2xl">
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
                onClick={() => setExist(false)}
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
                      d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000-18 9 9 0 000 18z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm leading-5 text-[#e9edef]">
                    This chat has already been imported.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#8696a0]">
                    You don't need to import the same chat again.
                  </p>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end border-t border-[#2a3942] px-5 py-3">
              <button
                type="button"
                onClick={() => setExist(false)}
                className="rounded-md bg-[#00a884] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#008f70] focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2 focus:ring-offset-[#202c33]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
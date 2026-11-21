import { useState } from "react";
import { importChat } from "../../api/electronApi.js";
import { ImportingDialog } from "./ImportingDialog.jsx";
import { ChatExistDialog } from "./ChatExistDialog.jsx";

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
  const [showDialog, setShowDialog] = useState(false);
  const [exist, setExist] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [path, setPath] = useState("");

  /**
   * Triggers native file dialog import pipeline and refreshes chat list on success.
   */
  const handleImport = async () => {
    if (isImporting) return;

    setExist(false);
    setNeedsName(false);
    setIsImporting(true);
    // Delay the modal slightly so quick imports don't flash a dialog.
    const dialogTimer = setTimeout(() => setShowDialog(true), 400);

    try {
      const result = await importChat();

      setExist(result?.exist ?? false);
      setNeedsName(result?.needsName ?? false);
      setPath(result?.filePath || "");

      if (result?.success && !result?.exist) {
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else if (result?.error) {
        console.error("[SidebarHeader] Import failed:", result.error);
      }
    } catch (err) {
      console.error("[SidebarHeader] Unexpected import error:", err);
    } finally {
      clearTimeout(dialogTimer);
      setShowDialog(false);
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* Sidebar Header */}
      <header className="h-[59px] bg-[#202c33] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* Sidebar heading, matching the WhatsApp chat list title */}
          <h1 className="text-[#e9edef] font-semibold text-[17px] tracking-tight truncate mr-2">
            Chats
          </h1>

          {/* Import Button */}
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            title="Import WhatsApp Export (.zip or .txt)"
            aria-label="Import WhatsApp Export Chat File"
            className="bg-[#00a884] hover:bg-[#06cf9c] active:scale-95 text-[#111b21] text-[13px] font-semibold px-3.5 h-8 rounded-full flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06cf9c]"
          >
            {isImporting ? (
              <>
                <svg
                  className="animate-spin w-3.5 h-3.5 text-[#111b21]"
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
                  className="w-3.5 h-3.5 text-[#111b21]"
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
      {showDialog && (<ImportingDialog />)}

      {/* Chat name / already exists dialog */}
      {(exist || needsName) && (
        <ChatExistDialog
          setExist={(value) => {
            setExist(value);
            if (!value) setNeedsName(false);
          }}
          needsName={needsName}
          path={path}
          onImportSuccess={onImportSuccess}
        />
      )}
    </>
  );
};
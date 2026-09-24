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
  const [exist, setExist] = useState(false);
  const [path, setPath] = useState("");

  /**
   * Triggers native file dialog import pipeline and refreshes chat list on success.
   */
  const handleImport = async () => {
    if (isImporting) return;

    setExist(false);
    setIsImporting(true);

    try {
      const result = await importChat();
      console.log(result);
      
      setExist(result?.exist ?? false);
      setPath(result?.filePath || "");

      if (result?.success && !result?.exist) {
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
      {exist && (<ChatExistDialog setExist={setExist} path={path} onImportSuccess={onImportSuccess} />)}
    </>
  );
};
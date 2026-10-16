import { useEffect, useState } from "react";
import { onImportProgress } from "../../api/electronApi.js";

/**
 * Full-screen modal shown while a chat export is being imported.
 *
 * Renders an indeterminate spinner until the main process reports progress,
 * then a phase-labeled determinate bar (archive extraction, message import).
 * The final save tail has no known duration, so it falls back to the spinner.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ImportingDialog = () => {
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        const unsubscribe = onImportProgress(setProgress);
        return unsubscribe;
    }, []);

    // Determinate only for phases with a known total; "saving" stays indeterminate.
    const determinate =
        progress &&
        progress.phase !== "saving" &&
        typeof progress.percent === "number" &&
        progress.percent >= 0;

    const label = (() => {
        if (!progress) return "Importing your chat...";
        if (progress.phase === "extracting") {
            return `Extracting archive… ${progress.current}/${progress.total} files`;
        }
        if (progress.phase === "importing") {
            return `Importing messages… ${progress.percent}%`;
        }
        return "Saving…";
    })();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="importing-title"
        >
            <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#2a3942] bg-[#202c33] shadow-2xl">
                {/* Dialog Header */}
                <div className="border-b border-[#2a3942] px-5 py-4">
                    <h2
                        id="importing-title"
                        className="text-base font-semibold text-[#e9edef]"
                    >
                        Importing Chat
                    </h2>
                </div>

                {/* Dialog Body */}
                <div className="px-5 py-6">
                    <div className="flex items-start gap-4">
                        {!determinate && (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2a3942]">
                                <svg
                                    className="h-5 w-5 animate-spin text-[#00a884]"
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
                                        strokeWidth="3"
                                    />

                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8H4z"
                                    />
                                </svg>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#e9edef]">
                                {label}
                            </p>

                            {determinate ? (
                                <div
                                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2a3942]"
                                    role="progressbar"
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                    aria-valuenow={progress.percent}
                                >
                                    <div
                                        className="h-full rounded-full bg-[#00a884] transition-[width] duration-200 ease-out"
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>
                            ) : (
                                <p className="mt-1 text-xs leading-5 text-[#8696a0]">
                                    Please wait while the chat is being processed.
                                    This may take a moment for large exports.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dialog Footer */}
                <div className="border-t border-[#2a3942] px-5 py-3">
                    <p className="text-center text-xs text-[#667781]">
                        Please don't close the application.
                    </p>
                </div>
            </div>
        </div>
    );
};

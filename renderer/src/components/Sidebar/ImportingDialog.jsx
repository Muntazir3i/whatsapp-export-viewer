export const ImportingDialog = () => {
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
                    <div className="flex items-center gap-4">
                        {/* Spinner */}
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

                        {/* Text */}
                        <div>
                            <p className="text-sm font-medium text-[#e9edef]">
                                Importing your chat...
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[#8696a0]">
                                Please wait while the chat is being processed. This may
                                take a moment for large exports.
                            </p>
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
    )
}

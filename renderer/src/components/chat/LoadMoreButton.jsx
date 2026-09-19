import React from 'react'

export const LoadMoreButton = ({handleLoadMore, isLoadingMore }) => {
    return (
        <div className="flex justify-center my-2">
            <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-[#182229] hover:bg-[#202c33] active:scale-95 text-[#00a884] text-xs font-medium px-4 py-1.5 rounded-full border border-[#222d34] shadow-sm transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-[#00a884] disabled:opacity-50 cursor-pointer"
            >
                {isLoadingMore ? (
                    <>
                        <svg className="animate-spin w-3.5 h-3.5 text-[#00a884]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Loading older messages...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5 text-[#00a884]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                        <span>Load older messages</span>
                    </>
                )}
            </button>
        </div>
    )
}

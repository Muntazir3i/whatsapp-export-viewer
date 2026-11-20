import { useEffect, useState } from "react";
import {
  getChatStats,
  getCategoryMessages,
  mediaUrl,
  openAttachment,
} from "../../api/electronApi.js";
import { AudioPlayer } from "./AudioPlayer.jsx";
import { LinkedText } from "./LinkedText.jsx";
import { MediaLightbox } from "./MediaLightbox.jsx";

/** Category rows shown in the overview, in display order. */
const CATEGORIES = [
  { key: "images", label: "Images" },
  { key: "audio", label: "Audio" },
  { key: "documents", label: "Documents" },
  { key: "links", label: "Links" },
];

/**
 * Shortens a stored timestamp to its clock portion ("7:36:20 PM" -> "7:36 PM").
 *
 * @param {string} [timestamp] - Stored `date time` timestamp.
 * @returns {string} Short time label.
 */
function formatTime(timestamp) {
  const time = (timestamp || "").split(" ").slice(1).join(" ").trim();
  return time.replace(/^(\d{1,2}:\d{2}):\d{2}/, "$1") || timestamp || "";
}

/**
 * Returns the last path segment of a stored media path.
 *
 * @param {string} [storedPath] - Path from `messages.message`.
 * @returns {string} File name.
 */
function baseName(storedPath = "") {
  return storedPath.split(/[\\/]/).pop();
}

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

/** Per-category icons used in the overview rows and detail header. */
const CATEGORY_ICONS = {
  images: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5h16v14H4zM8 11l3 3 2-2 3 3M9 9h.01" />
    </svg>
  ),
  audio: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  ),
  documents: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 3v5h5" />
    </svg>
  ),
  links: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  ),
};

/**
 * Top bar shared by the overview and category views.
 *
 * @param {Object} props
 * @param {string} props.title - Bar title.
 * @param {Function} props.onBack - Back handler.
 * @returns {JSX.Element}
 */
const InfoBar = ({ title, onBack }) => (
  <div className="h-[59px] bg-[#202c33] px-3 flex items-center gap-2 flex-shrink-0">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="p-2 rounded-full text-[#aebac1] hover:bg-white/5 hover:text-[#e9edef] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
    >
      <BackIcon />
    </button>

    <h2 className="text-[#e9edef] text-[16px] truncate">{title}</h2>
  </div>
);

/**
 * Chat info panel: total message count and browsable images, audio, documents, and links.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.selectedChat - Chat whose details are shown.
 * @param {Function} props.onBack - Returns to the message list.
 * @returns {JSX.Element}
 */
export const ChatInfo = ({ selectedChat, onBack }) => {
  const chatId = selectedChat?.id;
  const chatName = selectedChat?.name || "Chat";

  const [stats, setStats] = useState(null);
  const [category, setCategory] = useState(null);

  // Cached category result; `itemsLoading` is derived so switching categories
  // does not need a synchronous setState inside an effect.
  const [categoryResult, setCategoryResult] = useState({ key: null, items: [] });
  const [preview, setPreview] = useState(null);

  // Load aggregate counters for the overview.
  useEffect(() => {
    let active = true;
    getChatStats(chatId).then((result) => {
      if (active) setStats(result);
    });
    return () => {
      active = false;
    };
  }, [chatId]);

  // Load the selected category's messages.
  useEffect(() => {
    if (!category) return;

    let active = true;

    getCategoryMessages(chatId, category)
      .then((result) => {
        if (active) setCategoryResult({ key: category, items: result ?? [] });
      })
      .catch(() => {
        if (active) setCategoryResult({ key: category, items: [] });
      });

    return () => {
      active = false;
    };
  }, [chatId, category]);

  const itemsLoading = Boolean(category) && categoryResult.key !== category;
  const items = category && categoryResult.key === category ? categoryResult.items : [];

  const activeCategory = CATEGORIES.find((entry) => entry.key === category);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#111b21]">
      {category ? (
        <>
          <InfoBar title={activeCategory?.label} onBack={() => setCategory(null)} />

          <div className="flex-1 overflow-y-auto p-3">
            {itemsLoading && (
              <p className="text-center text-[#8696a0] text-sm py-6">Loading…</p>
            )}

            {!itemsLoading && items.length === 0 && (
              <p className="text-center text-[#8696a0] text-sm py-6">
                No {activeCategory?.label.toLowerCase()} in this chat.
              </p>
            )}

            {!itemsLoading && category === "images" && (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreview(item)}
                    aria-label={`Open image from ${item.sender ?? "unknown"}`}
                    className="aspect-square overflow-hidden rounded-sm bg-[#202c33] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                  >
                    <img
                      src={mediaUrl(item.message)}
                      alt={baseName(item.message)}
                      className="h-full w-full object-cover transition-transform duration-150 hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {!itemsLoading && category === "audio" && (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-[#202c33] p-2">
                    <p className="mb-1 text-[11px] text-[#8696a0] truncate">
                      {item.sender ?? "Unknown"} · {formatTime(item.timestamp)}
                    </p>
                    <AudioPlayer src={mediaUrl(item.message)} />
                  </div>
                ))}
              </div>
            )}

            {!itemsLoading && category === "documents" && (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openAttachment(item.message)}
                    title="Open with default app"
                    className="flex w-full items-center gap-3 rounded-lg bg-[#202c33] px-3 py-2.5 text-left transition-colors hover:bg-[#2a3942] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                  >
                    <span className="text-[#8696a0]">{CATEGORY_ICONS.documents}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[#e9edef]">
                        {baseName(item.message)}
                      </span>
                      <span className="block text-[11px] text-[#8696a0]">
                        {item.sender ?? "Unknown"} · {formatTime(item.timestamp)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!itemsLoading && category === "links" && (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-[#202c33] px-3 py-2.5">
                    <p className="mb-1 text-[11px] text-[#8696a0]">
                      {item.sender ?? "Unknown"} · {formatTime(item.timestamp)}
                    </p>
                    <p className="text-sm leading-[19px] text-[#e9edef] break-words">
                      <LinkedText text={item.message} />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <InfoBar title="Chat info" onBack={onBack} />

          <div className="flex-1 overflow-y-auto">
            {/* Profile summary */}
            <div className="flex flex-col items-center px-4 py-7 bg-[#111b21]">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#6b7c85] text-4xl font-medium text-white">
                {chatName.charAt(0).toUpperCase()}
              </div>

              <h3 className="mt-4 text-[20px] leading-tight text-[#e9edef] text-center break-words">
                {chatName}
              </h3>

              <p className="mt-1 text-[14px] text-[#8696a0]">
                {stats?.total ?? 0} messages
              </p>
            </div>

            {/* Category counters */}
            <div className="border-t border-[#222d34]/60">
              {CATEGORIES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setCategory(entry.key)}
                  className="flex w-full items-center gap-4 border-b border-[#222d34]/40 px-4 py-3 text-left transition-colors hover:bg-[#202c33] focus:outline-none focus-visible:bg-[#202c33]"
                >
                  <span className="text-[#8696a0]">{CATEGORY_ICONS[entry.key]}</span>

                  <span className="flex-1 text-[15px] text-[#e9edef]">
                    {entry.label}
                  </span>

                  <span className="text-[13px] text-[#8696a0]">
                    {stats?.[entry.key] ?? 0}
                  </span>

                  <span className="text-[#667781]">
                    <ChevronIcon />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {preview && (
        <MediaLightbox
          type="image"
          src={mediaUrl(preview.message)}
          fileName={baseName(preview.message)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

import { useState } from "react";
import { mediaUrl, openAttachment } from "../../api/electronApi.js";
import { AudioPlayer } from "./AudioPlayer.jsx";
import { LinkedText } from "./LinkedText.jsx";
import { MediaLightbox } from "./MediaLightbox.jsx";

/** WhatsApp-style colors used to identify speakers in group chats. */
const PARTICIPANT_COLORS = [
  "#53bdeb",
  "#f5b37f",
  "#a7d3a6",
  "#d7a8ea",
  "#f2a7b8",
  "#9fd3d3",
  "#e3c27a",
];

/**
 * Picks a stable color for a sender name.
 * @param {string} [name] - Sender display name.
 * @returns {string} Hex color.
 */
function senderColor(name = "") {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % 997;
  return PARTICIPANT_COLORS[hash % PARTICIPANT_COLORS.length];
}

/**
 * Extracts the clock portion of a stored timestamp and drops seconds.
 * "25/04/22 7:36:20 PM" -> "7:36 PM", "12/05/24 10:16" -> "10:16".
 *
 * @param {string} [timestamp] - Stored `date time` timestamp.
 * @returns {string} Short time label.
 */
function formatTime(timestamp) {
  if (!timestamp) return "";
  const [, ...timeParts] = timestamp.split(" ");
  const time = timeParts.join(" ").replace(/\s+/g, " ").trim();
  if (!time) return timestamp;
  return time.replace(/^(\d{1,2}:\d{2}):\d{2}/, "$1");
}

/** Double tick shown next to outgoing message times. */
const DoubleCheck = () => (
  <svg
    viewBox="0 0 18 12"
    className="h-[11px] w-[16px] text-[#53bdeb]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 6.5l3.2 3.2L12 2" />
    <path d="M6.6 9.6L14.2 2" />
  </svg>
);

/**
 * Renders a non-previewable attachment, or a media file that failed to load.
 * Clicking opens the file with its default application.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.fileName] - Original attachment file name.
 * @param {string} props.label - Short description shown under the file name.
 * @param {Function} props.onOpen - Called when the card is clicked.
 * @returns {JSX.Element}
 */
const AttachmentCard = ({ fileName, label, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    title="Open with default app"
    className="flex w-full items-center gap-3 rounded-md bg-black/10 p-3 text-left transition-colors hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
  >
    <div className="text-2xl" aria-hidden="true">
      {label === "Document" ? "📄" : "📎"}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium break-words">
        {fileName || "Attachment"}
      </p>
      <p className="text-xs text-[#aebac1]">{label}</p>
    </div>
  </button>
);

/**
 * Single WhatsApp-style message bubble (text, media, attachment, or system notice).
 *
 * @component
 * @param {Object} props
 * @param {Object} props.msg - Message row.
 * @param {boolean} props.isOutgoing - True when the sender matches the selected identity.
 * @param {boolean} props.showDateDivider - Render the date pill above this message.
 * @param {string} [props.dateLabel] - Formatted date for the divider.
 * @param {boolean} props.isFirstInGroup - First message of a same-sender run (gets the tail).
 * @param {boolean} [props.isHighlighted] - Marks the message targeted by a search jump.
 * @returns {JSX.Element}
 */
export const ChatMessage = ({
  msg,
  isOutgoing,
  showDateDivider,
  dateLabel,
  isFirstInGroup,
  isHighlighted = false,
}) => {
  // Which attachment is currently open in the fullscreen viewer (null = closed).
  const [openMedia, setOpenMedia] = useState(null);

  // Track the URL that failed so a different source automatically clears the error.
  const [failedSrc, setFailedSrc] = useState(null);
  const mediaFailed = failedSrc === msg.message;

  const mediaFileName =
    msg.type === "file" ? msg.message.split(/[\\/]/).pop() : null;

  // WhatsApp exports stickers as .webp. Legacy rows were classified as images,
  // so both the new "sticker" category and the extension are accepted.
  const isSticker =
    msg.type === "file" &&
    (msg.category === "sticker" || msg.extension === ".webp");

  // Stickers are shown without the chat bubble, like the real WhatsApp client.
  const bubbleClassName = isSticker
    ? "relative max-w-[65%] min-w-0 text-[14.2px]"
    : `relative max-w-[65%] min-w-0 rounded-lg px-[9px] py-[6px] text-[14.2px] leading-[19px] shadow-sm ${
        isOutgoing
          ? "bg-[#005c4b] text-[#e9edef]"
          : "bg-[#202c33] text-[#e9edef]"
      } ${
        isFirstInGroup
          ? isOutgoing
            ? "rounded-tr-none"
            : "rounded-tl-none"
          : ""
      } ${isHighlighted ? "ring-2 ring-[#53bdeb]" : ""}`;

  // Timestamp + delivery ticks, rendered inside the bubble like WhatsApp.
  const metaClassName = `flex items-center gap-0.5 text-[11px] leading-none ${
    isOutgoing ? "text-[#e9edef]/70" : "text-[#8696a0]"
  }`;

  const textMeta = (
    <span className={`float-right ml-2 mt-1 ${metaClassName}`}>
      {formatTime(msg.timestamp)}
      {isOutgoing && <DoubleCheck />}
    </span>
  );

  const blockMeta = (
    <div className={`mt-1 flex justify-end ${metaClassName}`}>
      {formatTime(msg.timestamp)}
      {isOutgoing && <DoubleCheck />}
    </div>
  );

  // Opens the stored attachment with the OS default app (PDF viewer, Word, etc.).
  const handleOpenAttachment = async (storedPath) => {
    const result = await openAttachment(storedPath);
    if (!result?.success) {
      console.error("Failed to open attachment:", result?.error);
    }
  };

  return (
    <>
      {/* Sticky date section header */}
      {showDateDivider && (
        <div className="flex justify-center my-3">
          <span className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-[5px] rounded-lg uppercase tracking-wide shadow-sm">
            {dateLabel || msg.timestamp}
          </span>
        </div>
      )}

      {/* System Messages & Message Bubble Row Container */}
      {msg.type === "system" ? (
        <div className="flex justify-center my-2" data-message-id={msg.id}>
          <span className={`max-w-[80%] bg-[#182229] text-[#8696a0] text-[12.5px] leading-[19px] px-3 py-[5px] rounded-lg text-center shadow-sm ${
            isHighlighted ? "ring-2 ring-[#53bdeb]" : ""
          }`}>
            {msg.message}
          </span>
        </div>
      ) : (
        <div
          className={`flex ${isOutgoing ? "justify-end" : "justify-start"} w-full rounded-md transition-colors ${
            isHighlighted ? "bg-[#53bdeb]/10" : ""
          }`}
          data-message-id={msg.id}
        >
          <div className={bubbleClassName}>
            {/* Bubble tail on the first message of a same-sender run */}
            {isFirstInGroup && !isSticker && (
              <svg
                viewBox="0 0 8 13"
                className={`absolute top-0 h-[13px] w-2 ${
                  isOutgoing ? "-right-2" : "-left-2"
                }`}
                fill={isOutgoing ? "#005c4b" : "#202c33"}
                aria-hidden="true"
              >
                {isOutgoing ? (
                  <path d="M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z" />
                ) : (
                  <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                )}
              </svg>
            )}

            {!isOutgoing && msg.sender && isFirstInGroup && (
              <span
                className="block text-[13px] font-medium mb-0.5 truncate"
                style={{ color: senderColor(msg.sender) }}
              >
                {msg.sender}
              </span>
            )}

            <div className="min-w-0">
              {mediaFailed ? (
                <AttachmentCard
                  fileName={mediaFileName}
                  label="Attachment unavailable"
                  onOpen={() => handleOpenAttachment(msg.message)}
                />
              ) : isSticker ? (
                <button
                  type="button"
                  onClick={() => setOpenMedia("image")}
                  aria-label="Open sticker preview"
                  className="block cursor-zoom-in rounded-md transition-transform duration-200 hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                >
                  <img
                    src={mediaUrl(msg.message)}
                    alt={mediaFileName || "Sticker"}
                    className="block h-32 w-32 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:h-36 sm:w-36"
                    loading="lazy"
                    onError={() => setFailedSrc(msg.message)}
                  />
                </button>
              ) : msg.type === "media" ? (
                <p className="whitespace-pre-wrap break-words italic text-[#8696a0]">
                  Media omitted
                  {textMeta}
                </p>
              ) : msg.type === "file" ? (
                <div className="mb-2">
                  {msg.category === "image" ? (
                    <button
                      type="button"
                      onClick={() => setOpenMedia("image")}
                      aria-label="Open image preview"
                      className="block cursor-zoom-in rounded-md transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                    >
                      <img
                        src={mediaUrl(msg.message)}
                        alt={mediaFileName || "Image attachment"}
                        className="block max-w-full max-h-80 rounded-md object-contain"
                        loading="lazy"
                        onError={() => setFailedSrc(msg.message)}
                      />
                    </button>
                  ) : msg.category === "video" ? (
                    <button
                      type="button"
                      onClick={() => setOpenMedia("video")}
                      aria-label="Open video preview"
                      className="group relative block cursor-zoom-in overflow-hidden rounded-md transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
                    >
                      <video
                        src={mediaUrl(msg.message)}
                        preload="metadata"
                        className="block max-w-full max-h-80 rounded-md"
                        onError={() => setFailedSrc(msg.message)}
                      >
                        Your browser does not support video playback.
                      </video>

                      {/* Play badge, mirroring WhatsApp's video thumbnail */}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition-transform duration-150 group-hover:scale-110">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="ml-0.5 h-6 w-6"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  ) : msg.category === "audio" ? (
                    <AudioPlayer
                      src={mediaUrl(msg.message)}
                      onError={() => setFailedSrc(msg.message)}
                    />
                  ) : (
                    <AttachmentCard
                      fileName={mediaFileName}
                      label={
                        msg.category === "document" ? "Document" : "Attachment"
                      }
                      onOpen={() => handleOpenAttachment(msg.message)}
                    />
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  <LinkedText text={msg.message} />
                  {textMeta}
                </p>
              )}

              {/* Media and attachment messages keep the meta below the content. */}
              {(isSticker || msg.type === "file" || mediaFailed) && blockMeta}
            </div>
          </div>
        </div>
      )}

      {openMedia && (
        <MediaLightbox
          type={openMedia}
          src={mediaUrl(msg.message)}
          fileName={mediaFileName}
          onClose={() => setOpenMedia(null)}
        />
      )}
    </>
  );
};

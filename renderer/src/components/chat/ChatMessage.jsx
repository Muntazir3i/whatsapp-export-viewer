import { useState } from "react";
import { mediaUrl } from "../../api/electronApi.js";
import { AudioPlayer } from "./AudioPlayer.jsx";
import { MediaLightbox } from "./MediaLightbox.jsx";

/**
 * Renders a non-previewable attachment, or a media file that failed to load.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.fileName] - Original attachment file name.
 * @param {string} props.label - Short description shown under the file name.
 * @returns {JSX.Element}
 */
const AttachmentCard = ({ fileName, label }) => (
  <div className="flex items-center gap-3 rounded-md bg-black/10 p-3">
    <div className="text-2xl" aria-hidden="true">
      {label === "Document" ? "📄" : "📎"}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium break-words">
        {fileName || "Attachment"}
      </p>
      <p className="text-xs text-[#aebac1]">{label}</p>
    </div>
  </div>
);

export const ChatMessage = ({ msg, isOutgoing, showDateDivider, currentDate }) => {
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
    ? "relative max-w-[85%] sm:max-w-[70%] min-w-0 text-sm"
    : `relative max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg px-3 py-1.5 text-sm shadow ${
        isOutgoing
          ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
          : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
      }`;

  return (
    <>

      {/* Sticky date section header */}
      {showDateDivider && (
        <div className="flex justify-center my-3">
          <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
            {currentDate}
          </span>
        </div>
      )}

      {/* System Messages & Message Bubble Row Container */}

      {msg.type === "system" ? (
  <div className="flex justify-center my-3">
    <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium shadow-sm">
      {msg.message}
    </span>
  </div>
) : (
  <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} w-full`}>
    <div className={bubbleClassName}>
      {!isOutgoing && msg.sender && (
        <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5 truncate">
          {msg.sender}
        </span>
      )}

      <div className="min-w-0">
        {mediaFailed ? (
          <AttachmentCard fileName={mediaFileName} label="Attachment unavailable" />
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
                label={msg.category === "document" ? "Document" : "Attachment"}
              />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed">
            {msg.message}
          </p>
        )}

        <div className={`flex justify-end ${isSticker ? "mt-1" : ""}`}>
          <span className="text-[10px] text-[#8696a0] whitespace-nowrap flex-shrink-0">
            {msg.timestamp}
          </span>
        </div>
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
  )
}

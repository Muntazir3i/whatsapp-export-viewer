import { useState } from "react";
import { mediaUrl } from "../../api/electronApi.js";
import { MediaLightbox } from "./MediaLightbox.jsx";

export const ChatMessage = ({ msg, isOutgoing, showDateDivider, currentDate }) => {
  // Which attachment is currently open in the fullscreen viewer (null = closed).
  const [openMedia, setOpenMedia] = useState(null);

  const mediaFileName =
    msg.type === "file" ? msg.message.split(/[\\/]/).pop() : null;

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
    <div
      className={`relative max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg px-3 py-1.5 text-sm shadow ${
        isOutgoing
          ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
          : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
      }`}
    >
      {!isOutgoing && msg.sender && (
        <span className="block text-xs font-semibold text-[#53bdeb] mb-0.5 truncate">
          {msg.sender}
        </span>
      )}

      <div className="min-w-0">
        {msg.type === "file" ? (
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
              <div className="min-w-0">
                <audio
                  src={mediaUrl(msg.message)}
                  controls
                  preload="metadata"
                  className="block w-full max-w-full"
                />
                <p className="mt-1 text-xs text-[#aebac1] break-words">
                  {msg.message.split(/[\\/]/).pop()}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md bg-black/10 p-3">
                <div className="text-2xl" aria-hidden="true">
                  {msg.category === "document" ? "📄" : "📎"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    {msg.message.split(/[\\/]/).pop() || "Attachment"}
                  </p>
                  <p className="text-xs text-[#aebac1]">
                    {msg.category === "document"
                      ? "Document"
                      : "Attachment"}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed">
            {msg.message}
          </p>
        )}

        <div className="flex justify-end">
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

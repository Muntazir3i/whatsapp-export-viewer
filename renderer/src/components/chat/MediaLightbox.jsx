import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Fullscreen viewer for image and video attachments.
 *
 * Renders into `document.body` so the overlay is not clipped by the scrollable
 * message container. Closes on backdrop click, the close button, or Escape.
 *
 * @component
 * @param {Object} props
 * @param {"image"|"video"} props.type - Attachment category being previewed.
 * @param {string} props.src - Protocol URL built with `mediaUrl()`.
 * @param {string} [props.fileName] - Original attachment file name, shown under the media.
 * @param {Function} props.onClose - Callback invoked when the viewer should close.
 * @returns {React.ReactPortal}
 */
export const MediaLightbox = ({ type, src, fileName, onClose }) => {
  useEffect(() => {
    /**
     * Escape closes the viewer.
     * @param {KeyboardEvent} event
     */
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    // Prevent the chat behind the overlay from scrolling while it is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="media-lightbox fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={type === "image" ? "Image preview" : "Video preview"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition-colors duration-150 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
      >
        <span aria-hidden="true">&times;</span>
      </button>

      <div
        className="media-lightbox-content flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={src}
            alt={fileName || "Image attachment"}
            className="max-h-[85vh] max-w-[92vw] rounded-md object-contain shadow-2xl"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-[92vw] rounded-md shadow-2xl"
          >
            Your browser does not support video playback.
          </video>
        )}

        {fileName && (
          <p className="max-w-[92vw] truncate text-xs text-white/70">
            {fileName}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

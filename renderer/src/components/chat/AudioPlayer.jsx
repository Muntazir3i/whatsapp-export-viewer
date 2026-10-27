import { useEffect, useMemo, useRef, useState } from "react";

/** Playback speed options cycled by the 1x pill, mirroring WhatsApp. */
const PLAYBACK_RATES = [1, 1.5, 2];

/** Number of bars in the rendered waveform. */
const BAR_COUNT = 42;

/**
 * Builds a deterministic pseudo-waveform for an audio file.
 *
 * WhatsApp renders the real decoded waveform. Decoding every file up front
 * would be expensive, so we derive a stable wave from the file path instead:
 * the same audio always produces the same shape.
 *
 * @param {string} seedText - Stable identifier for the audio (its media URL).
 * @returns {number[]} Bar heights between 0.2 and 1.
 */
function buildWaveform(seedText) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (Math.imul(seed, 31) + seedText.charCodeAt(i)) >>> 0;
  }

  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    bars.push(0.2 + (seed / 4294967295) * 0.8);
  }
  return bars;
}

/**
 * Formats seconds as `m:ss` (or `h:mm:ss` for long recordings).
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * WhatsApp-style voice note player: circular play/pause button, seekable
 * waveform, remaining time, and a playback-speed pill.
 *
 * @component
 * @param {Object} props
 * @param {string} props.src - Audio URL built with `mediaUrl()`.
 * @returns {JSX.Element}
 */
export const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);

  const waveform = useMemo(() => buildWaveform(src), [src]);
  const rate = PLAYBACK_RATES[rateIndex];
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  // Keep the element's rate in sync with the pill.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch (err) {
        console.error("Failed to play audio:", err);
      }
    } else {
      audio.pause();
    }
  };

  /**
   * Maps a pointer position on the waveform to a playback time.
   * @param {PointerEvent | React.PointerEvent} event
   */
  const seekToPointer = (event) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !Number.isFinite(audio.duration)) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const handlePointerDown = (event) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekToPointer(event);
  };

  const handlePointerMove = (event) => {
    if (draggingRef.current) seekToPointer(event);
  };

  const handlePointerUp = (event) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration)) return;

      const delta = event.key === "ArrowLeft" ? -5 : 5;
      audio.currentTime = Math.min(
        audio.duration,
        Math.max(0, audio.currentTime + delta)
      );
      setCurrentTime(audio.currentTime);
    }
  };

  return (
    <div className="flex w-[260px] max-w-full items-center gap-2 py-1">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9edef] text-[#0b141a] transition-transform duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
      >
        {isPlaying ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Number.isFinite(duration) ? Math.round(duration) : 0}
        aria-valuenow={Math.round(currentTime)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="flex h-8 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[2px] rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
      >
        {waveform.map((height, index) => {
          const isPlayed = index / waveform.length < progress;
          return (
            <span
              key={index}
              className={`w-full flex-1 rounded-full transition-colors duration-100 ${
                isPlayed ? "bg-white" : "bg-white/35"
              }`}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          );
        })}
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-[#aebac1]">
        {formatTime(remaining)}
      </span>

      <button
        type="button"
        onClick={() => setRateIndex((index) => (index + 1) % PLAYBACK_RATES.length)}
        aria-label={`Playback speed ${rate}x`}
        className="shrink-0 rounded-full px-1 text-[11px] font-medium text-[#aebac1] transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]"
      >
        {rate}x
      </button>
    </div>
  );
};

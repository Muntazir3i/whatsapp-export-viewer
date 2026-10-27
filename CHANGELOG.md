# Changelog

All notable changes to this project are documented here.

## [1.1.0] - 2026-10-27

### Added
- Media attachments from `.zip` exports now render inside the chat: inline images,
  video previews with a play badge, a waveform audio player, stickers, and
  document/archive cards.
- Fullscreen lightbox for images and videos, closable via the backdrop, the close
  button, or `Escape`.
- Secure `media://` streaming for extracted attachments, with paths constrained to
  `<userData>/imports`.
- Attachment classification (`extension` and `category`) and `.webp` sticker
  detection.
- Sidebar previews for media messages (e.g. "📷 Photo", "🎤 Voice message") instead
  of raw file paths.
- Fallback attachment cards when a media file is missing or cannot be decoded.
- Chat folder validation so custom names cannot escape the imports directory.
- Tests for media path resolution and chat folder safety (`npm test`).

### Changed
- Media paths are stored relative to the imports directory (legacy absolute paths
  still resolve).
- README updated with media features, `media://` architecture, schema/media
  storage, roadmap, and FAQ.

### Known limitations
- Chats imported before v1.1.0 are not backfilled; re-import a chat to classify and
  render its attachments.
- Export keywords are English-only: `(file attached)` and `<Media omitted>` are
  matched literally.
- Audio waveforms are synthetic, not decoded from the audio.
- Animated `.webp` stickers render as static images.
- Documents and archives render as cards but cannot be opened or downloaded from
  the app.
- iOS bracket-style exports are not supported.

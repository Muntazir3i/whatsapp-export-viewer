# Changelog

All notable changes to this project are documented here.

## [1.2.0] - 2026-11-21

### Added
- iOS WhatsApp exports are supported alongside Android, for both `WhatsApp Chat - <contact>.zip`
  archives and a directly selected `_chat.txt` file.
- iOS attachment notation (`<attached: file>`), edited-message markers, quoted replies with
  attachments, blocked-contact notices, and the end-to-end encryption banner.
- Unnamed exports (iOS `_chat.txt`, renamed archives) now prompt for a chat name before
  importing instead of using the raw filename.
- iOS media placeholders (`image omitted`, `video omitted`, `audio omitted`, `sticker omitted`,
  `GIF omitted`, `Contact card omitted`, `document omitted`) render as a "Media omitted" bubble.
- Parser tests for Android and iOS line formats, flavor detection, and attachment classification.

### Changed
- Message-start detection is structural and accepts locale date separators (`25/04/22`,
  `25.04.22`, `25-04-22`) and two- or four-digit years on both platforms.
- Flavor detection reads the first non-empty line and checks the iOS bracket syntax first, so
  an iOS first line containing `" - "` is no longer misread as Android.
- `_chat.txt` selected from an extracted folder uses the folder name
  (`WhatsApp Chat - Anna`) as the chat name when it matches a known export pattern.
- Invisible bidi marks are stripped from sender names and around attachment names and
  edited-message markers.

### Fixed
- Unknown or malformed exports now fail with a clear "Unsupported export format" error before
  a chat row is created, instead of leaving an empty chat that blocks retries as a duplicate.
- Edited iOS messages no longer keep a trailing `U+200E` after the marker is removed.
- Attachment filenames are reduced to their basename before path resolution.

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

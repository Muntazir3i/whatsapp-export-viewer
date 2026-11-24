# Changelog

All notable changes to this project are documented here.

## [1.2.0] - 2026-11-24

### Added
- In-chat full-text search backed by SQLite FTS5: highlighted snippets, match counts,
  arrow navigation between hits, and jump-to-message.
- Chat info panel with total message counts and browsable Images, Audio, Documents, and
  Links categories.
- Attachments can be opened with the OS default application from inline cards and the
  chat info panel.
- Links in message text open in the system browser instead of an Electron window.
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
- Message text is indexed in `messages_fts` through SQLite triggers; in-chat search
  queries that index for highlighted snippets.
- A `(chat_id, id)` index supports message pagination and search jumps.
- Message-start detection is structural and accepts locale date separators (`25/04/22`,
  `25.04.22`, `25-04-22`) and two- or four-digit years on both platforms.
- Flavor detection reads the first non-empty line and checks the iOS bracket syntax first, so
  an iOS first line containing `" - "` is no longer misread as Android.
- `_chat.txt` selected from an extracted folder uses the folder name
  (`WhatsApp Chat - Anna`) as the chat name when it matches a known export pattern.
- Invisible bidi control marks (`U+200E`, `U+200F`, `U+202A`–`U+202E`,
  `U+2066`–`U+2069`) and byte-order marks are stripped from timestamps, sender names,
  and message bodies — including marks embedded mid-message. Joiners (`U+200C`/`U+200D`)
  and the narrow no-break space in iOS timestamps are preserved.

### Fixed
- Unknown or malformed exports now fail with a clear "Unsupported export format" error before
  a chat row is created, instead of leaving an empty chat that blocks retries as a duplicate.
- Edited iOS messages no longer keep a trailing `U+200E` after the marker is removed.
- Attachment filenames are reduced to their basename before path resolution.

### Security
- ZIP extraction now rejects symlink entries, absolute paths, and `..` traversal before
  writing, preventing a malicious archive from writing outside `<userData>/imports`.
- Replaced `extract-zip` with `yauzl`; `extract-zip` has no fix for its symlink
  path-traversal advisory.

### Known limitations
- In-chat search is not backfilled for chats imported before v1.2.0. Existing chats
  still render normally, but only messages indexed in v1.2.0 or later are searchable
  until the chat is re-imported.
- Databases created by v1.0.0 predate the attachment columns and are not migrated;
  reset the database or re-import chats.
- Search is scoped to the open chat; there is no cross-chat search yet.
- Audio waveforms are synthetic, not decoded from the audio.
- Animated `.webp` stickers render as static images.
- Export keywords remain English-only.

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

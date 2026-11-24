# In-Chat Search — Design & Implementation Notes

> Status: implemented on `dev` (`adfea4b`, `a9d963b`, `574f3d7`, `e305160`)
> Scope: full-text search inside a single conversation
> Tests: 45 passing (`npm test`)

This is the long-form record of how in-chat search was built: what each layer does,
why it was built that way, what was rejected, and the mistakes made along the way.

---

## Table of contents

1. [What the feature does](#1-what-the-feature-does)
2. [Scope and non-goals](#2-scope-and-non-goals)
3. [Decision log](#3-decision-log)
4. [Architecture](#4-architecture)
5. [FTS5 from first principles](#5-fts5-from-first-principles)
6. [Database schema](#6-database-schema)
7. [The query parser](#7-the-query-parser)
8. [SQL design](#8-sql-design)
9. [Pagination: OFFSET vs cursor](#9-pagination-offset-vs-cursor)
10. [API surface](#10-api-surface)
11. [Renderer design](#11-renderer-design)
12. [End-to-end flows](#12-end-to-end-flows)
13. [Edge cases](#13-edge-cases)
14. [Testing](#14-testing)
15. [Benchmarks and methodology](#15-benchmarks-and-methodology)
16. [React constraints learned](#16-react-constraints-learned)
17. [Bugs found during the work](#17-bugs-found-during-the-work)
18. [Limitations and future work](#18-limitations-and-future-work)
19. [File map](#19-file-map)
20. [Glossary](#20-glossary)
21. [FAQ: why this, why not that](#21-faq-why-this-why-not-that)

---

## 1. What the feature does

A search icon in the chat header opens a panel with a text field.

- Typing at least two characters searches **only the open chat**, in `text` and
  `link` messages.
- Results are newest-first and show sender, time, and a snippet with the matched
  words highlighted.
- A true total is shown (for example "217 messages") and `Show more` appends the
  next page of 50.
- Clicking a result closes the panel, loads a window of messages centered on that
  hit, scrolls it into view, and rings the bubble.
- While a hit is focused, a bar appears with `3 / 217` and up/down arrows to move
  between matches. The arrows load the next page of results automatically when they
  reach the end of the loaded list.
- `Back to latest` reloads the newest page and clears the highlight.

Everything is local. No network calls, no telemetry.

---

## 2. Scope and non-goals

### In scope

- One conversation at a time.
- Message body text and link messages.
- Prefix matching while typing.
- Relevance-independent, chronological result order.
- Jumping to a hit, with context on both sides.
- Paging through every match, not just the first page.

### Explicitly out of scope

| Not built | Why |
|---|---|
| Global search across chats | Needs cross-chat ranking and a different result UI |
| Sender / date / file-name filters | Would require indexing more columns and a filter UI |
| Regular expressions, wildcards, `OR`/`NOT` | The parser intentionally treats input as literal text |
| Fuzzy matching / typo tolerance | FTS5 does not provide it; would need a second index |
| Search history / saved searches | Not requested |
| Migrations for existing databases | The database is considered disposable |
| Word-level highlight inside a bubble | Ring + row tint were enough for this milestone |
| Command palette | Deferred |

---

## 3. Decision log

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| 1 | SQLite FTS5 | `LIKE '%term%'` | Ranking, snippets, prefix search, and index speed; also the foundation for global search later |
| 2 | One global FTS table filtered by `chat_id` | One FTS table per chat | Per-chat tables multiply schema objects and make global search impossible without a union |
| 3 | Index only `message` | Index sender, timestamp, type too | In-chat search is about message text; extra columns increase index size and change ranking later |
| 4 | External content (`content='messages'`) | Contentless or standalone FTS table | No duplicated message text; `messages` stays authoritative |
| 5 | Triggers keep the index in sync | Application-level inserts into the FTS table | Forgetting an insert anywhere desynchronizes search; triggers are enforced by SQLite |
| 6 | No migrations | `PRAGMA user_version` + upgrade path | Data is disposable; a migration system is premature complexity |
| 7 | Quote every token | Strip punctuation | Stripping breaks `C++`, `don't`, and turns `AND` into something else |
| 8 | Prefix only the last token | Prefix every token | Every prefix multiplies candidate scans; last-token prefix covers typing |
| 9 | Chronological ordering | `bm25` relevance | Matches WhatsApp's in-chat behavior; makes keyset pagination possible with a unique key |
| 10 | Keyset (cursor) pagination | `OFFSET` | Stable under writes, no positional skip, index-friendly plan |
| 11 | Count total once, on page 1 | Count on every page | Counting scans all matches; the client can retain the first count |
| 12 | Centered jump window | Window ending at the hit | The original bug: there was nothing below the hit to scroll to |
| 13 | Bidirectional pagination after a jump | Only load older messages | The app already had older pagination; newer was missing |
| 14 | Search state lifted into a hook | State inside the panel component | Results must survive closing the panel so arrows and `Show more` keep working |
| 15 | Ring + row tint for the hit | Scroll only | A highlighted message is easier to find than a scroll position |
| 16 | Debounce 250 ms | Search per keystroke | One query per pause, not one per character |
| 17 | Minimum 2 characters | Search at 1 character | Single characters match almost everything and waste a query |
| 18 | Errors contained at the IPC boundary | Let promises reject into React | A rejected IPC call would break the panel with raw SQL text |

---

## 4. Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Renderer (React)                                                 │
│                                                                  │
│  ChatHeader ── toggles ──► ChatView                              │
│                              │                                   │
│                              ├── ChatSearch (presentational)     │
│                              ├── useChatSearch (query + pages)   │
│                              ├── useMessages   (chat window)     │
│                              └── navigation bar (arrows)         │
│                              │                                   │
│                     electronApi.js (defensive wrappers)          │
└──────────────────────────────┼───────────────────────────────────┘
                               │ contextBridge
┌──────────────────────────────▼───────────────────────────────────┐
│ Preload (contextIsolation)                                       │
│   searchMessages, getMessageWindow, loadNewerMessages, …         │
└──────────────────────────────┼───────────────────────────────────┘
                               │ ipcRenderer.invoke
┌──────────────────────────────▼───────────────────────────────────┐
│ Main process                                                     │
│   chatHandlers.js                                                │
│     "search-messages"      → chatService.searchMessages          │
│     "get-message-window"   → chatService.getMessageWindow        │
│     "load-newer-messages"  → chatService.loadNewerMessages       │
│                                                                  │
│   chatService.js     ← buildMatchQuery lives here                │
│   chatRepository.js  ← all SQL                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ better-sqlite3 (synchronous)
┌──────────────────────────────▼───────────────────────────────────┐
│ SQLite                                                           │
│   messages        (real data)                                    │
│   messages_fts    (FTS5 inverted index, external content)        │
│   idx_messages_chat_id_id                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Responsibilities

| Layer | Owns | Must not |
|---|---|---|
| `chatRepository` | SQL, ordering, limits, window math | Know about UI or raw user text |
| `chatService` | Parsing raw text, composing result payloads | Format anything for display |
| IPC handler | Transport, error containment | Contain search logic |
| `useChatSearch` | Query state, debounce, paging, totals | Know about scrolling or highlighting |
| `useMessages` | Message list, jump window, newer/older paging | Know about search results |
| `ChatView` | Composition, arrows, scroll behavior | Query SQLite directly |
| `ChatSearch` | Rendering the panel | Own search state |

---

## 5. FTS5 from first principles

### 5.1 Why a B-tree cannot do this

A B-tree index answers questions like:

```sql
WHERE id = 42
WHERE id < 100
WHERE name = 'Ann'
```

It maps a value to a position. It cannot answer "contains this word" without
scanning every row, which is exactly what `LIKE '%word%'` does.

### 5.2 Inverted index

A full-text index reverses the relationship:

```text
"quick" → [1, 7, 12, 900]
"brown" → [1, 55]
"fox"   → [1, 900]
```

Each list is a **postings list** or **doclist**. A query looks up the term in a
dictionary and intersects the lists. This is why word lookup is fast, and why
partial words, punctuation, and emoji are not searchable — they never became terms.

### 5.3 FTS5 is a virtual table

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(...);
```

It looks like a table to SQL, but the FTS5 module implements storage and querying.
You can use `MATCH`, `bm25()`, `snippet()`, and special commands. You cannot attach
a normal index to it or change its tokenizer with `ALTER`.

### 5.4 Shadow tables

Creating the virtual table creates internal tables:

```text
messages_fts_data
messages_fts_idx
messages_fts_docsize
messages_fts_config
```

Never query, modify, or drop these. SQLite owns them.

### 5.5 External content

```sql
content = 'messages',
content_rowid = 'id'
```

The FTS table stores only the index; message text stays in `messages`. Consequences:

- No duplicate storage.
- `snippet()` and `highlight()` must read `messages` to build output, which makes
  them more expensive than pure index reads.
- `SELECT count(*) FROM messages_fts` is not a reliable "is the index populated?"
  check. With external content it can mirror `messages` even when nothing is indexed.
- The join `messages_fts.rowid = messages.id` is what recovers the metadata the FTS
  table does not store.

### 5.6 Tokenizer

```sql
tokenize = 'unicode61 remove_diacritics 2'
```

- Splits on Unicode word boundaries.
- Folds case: `Quick` matches `quick`.
- Removes diacritics: `cafe` matches `café`.
- Treats `+`, punctuation, and emoji as separators, so `C++` is indexed as `c`
  and emoji are unsearchable.

### 5.7 `bm25` and `snippet`

- `bm25(table)` returns a **negative** relevance score in SQLite. Ascending order is
  best-first. The score favors rare terms and shorter documents.
- `snippet(table, column, start, end, ellipsis, tokens)` returns an excerpt around
  the match with markers around matched terms. Here the markers are `char(1)` and
  `char(2)` — control characters that cannot collide with readable text.

---

## 6. Database schema

### 6.1 DDL

```sql
CREATE TABLE IF NOT EXISTS chats(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_name TEXT,
    participants TEXT NOT NULL DEFAULT '[]',
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender TEXT,
    message TEXT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    extension TEXT,
    category TEXT,
    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    message,
    content = 'messages',
    content_rowid = 'id',
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS message_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, message) VALUES (new.id, new.message);
END;

CREATE TRIGGER IF NOT EXISTS message_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, message)
    VALUES ('delete', old.id, old.message);
END;

CREATE TRIGGER IF NOT EXISTS message_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, message)
    VALUES ('delete', old.id, old.message);

    INSERT INTO messages_fts(rowid, message) VALUES (new.id, new.message);
END;

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id ON messages(chat_id, id);
```

### 6.2 Why triggers exist

Creating the virtual table does **not** index existing rows and does not update on
future writes. The insert trigger is what makes imports searchable. Without it,
search always returns nothing, and no error explains why.

The delete trigger is not a SQL `DELETE`:

```sql
INSERT INTO messages_fts(messages_fts, rowid, message) VALUES ('delete', old.id, old.message);
```

That is an FTS5 command telling the index to remove the tokens produced by
`old.message` for that rowid. FTS5 needs the old text to find the postings.

There is no FTS5 update command, so update = delete old + insert new.

### 6.3 Why `idx_messages_chat_id_id`

A plain B-tree on `(chat_id, id)` serves:

- newest 100 messages for a chat
- older-message pagination (`id < cursor`)
- newer-message pagination (`id > cursor`)
- the centered jump window
- the cursor search page
- deleting a chat's messages

It is why `WHERE chat_id = ? AND id < ?` can run without a sort.

### 6.4 Idempotency and no migrations

`createSchema` runs on every app start, so every object uses `IF NOT EXISTS`.

The trap: `IF NOT EXISTS` **never updates** an existing definition. If the
tokenizer or indexed columns change, an existing database keeps the old version.

Rule for this project:

> If the search schema changes, delete `chats.db` and re-import. No migration path.

That is acceptable because the database holds only imported, re-importable data.
It stops being acceptable when a user has data they cannot recreate, at which point
`PRAGMA user_version` and a rebuild step become necessary.

### 6.5 Foreign keys

`database.js` enables:

```js
db.pragma("foreign_keys = ON");
```

Without it, `ON DELETE CASCADE` is ignored, deleting a chat would orphan messages,
and the delete triggers would never fire.

---

## 7. The query parser

### 7.1 `MATCH` is a grammar, not text

Measured behavior on this app's SQLite:

| Raw input | Result |
|---|---|
| `C++` | `fts5: syntax error near "+"` |
| `AND` | `syntax error near "AND"` |
| `quick-brown` | `no such column: brown` |
| `-quick` | `no such column: quick` |
| `quick:` | `no such column: quick` |
| `{quick}` | `no such column: quick` |
| `"unterminated` | `unterminated string` |
| `*` | `unknown special query` |
| `quick OR fox` | runs, but as a boolean expression (wrong intent) |
| `quick NOT fox` | runs, with different meaning |

Two failure classes:

1. **Hard errors** — the query never executes.
2. **Silent semantic changes** — worse, because results look plausible.

`?` parameter binding protects against SQL injection. It does **not** protect
against the FTS grammar. Both defenses are needed.

### 7.2 Why not strip special characters

- `C++` → `C`: a completely different search.
- `don't` → `dont`: `unicode61` indexes `don` and `t`, so `dont` matches nothing.
- `AND` is a real English word.

Removal destroys valid input. Quoting preserves it.

### 7.3 Implementation

`src/parser/searchQuery.js`

```js
import { stripInvisibleMarks } from "./messageParser.js";

export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 256;
const TOKEN_PATTERN = /"([^"]*)"|(\S+)/g;
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

function tokenize(text) {
    const tokens = [];

    for (const match of text.matchAll(TOKEN_PATTERN)) {
        const phrase = match[1];
        const word = match[2];
        const token = (phrase ?? word.replaceAll('"', " ")).trim();

        if (token && HAS_WORD_CHARACTER.test(token)) {
            tokens.push(token);
        }
    }

    return tokens;
}

function quoteToken(token) {
    return `"${token.replaceAll('"', '""')}"`;
}

export function buildMatchQuery(raw) {
    const text = stripInvisibleMarks(String(raw ?? ""))
        .slice(0, MAX_QUERY_LENGTH)
        .trim();

    if (text.length < MIN_QUERY_LENGTH) return null;

    const tokens = tokenize(text);
    if (tokens.length === 0) return null;

    return tokens
        .map((token, index) => {
            const quoted = quoteToken(token);
            return index === tokens.length - 1 ? `${quoted}*` : quoted;
        })
        .join(" ");
}
```

### 7.4 Rule-by-rule rationale

| Step | Why |
|---|---|
| `stripInvisibleMarks` | WhatsApp exports contain bidi control characters that would become junk tokens |
| slice to 256 | Bounds the MATCH string; a search box never needs more |
| `< 2` characters → `null` | One character matches almost everything |
| `"([^"]*)"` | Supports `"exact phrase"` without extra UI |
| Stray `"` → space | `say "hi` searches `say` and `hi` instead of an unmatchable literal quote |
| Drop tokens without letters/digits | `???`, `...`, `-` can never match because they are tokenizer separators |
| Escape `"` by doubling | FTS5's string-literal escape rule |
| `*` only on the last token | Coverage for typing without exploding the candidate set |

### 7.5 Examples

| Input | Output |
|---|---|
| `quick brown` | `"quick" "brown"*` |
| `C++` | `"C++"*` |
| `AND` | `"AND"*` |
| `don't` | `"don't"*` |
| `"happy birthday"` | `"happy birthday"*` |
| `say "hi` | `"say" "hi"*` |
| `???` | `null` |

### 7.6 What it does not support

- Boolean operators (`AND`, `OR`, `NOT`, `NEAR`) — all literal.
- Stemming, fuzzy matches, regex.
- Prefix on every token.
- Emoji, which the tokenizer discards.

---

## 8. SQL design

### 8.1 Search statement

```sql
SELECT
    m.id,
    m.sender,
    m.timestamp,
    snippet(messages_fts, 0, char(1), char(2), '…', 12) AS snippet
FROM messages_fts
JOIN messages m ON m.id = messages_fts.rowid
WHERE messages_fts MATCH ?
    AND m.chat_id = ?
    AND m.type IN ('text', 'link')
    AND m.id < ?
ORDER BY m.id DESC
LIMIT ?;
```

| Clause | Reason |
|---|---|
| `MATCH ?` | Bound expression from the parser; never raw input |
| `m.chat_id = ?` | The only difference between in-chat and global search |
| `type IN ('text','link')` | Excludes media placeholders, file paths, system notices |
| `m.id < ?` | Keyset cursor; page 1 passes `Number.MAX_SAFE_INTEGER` |
| `ORDER BY m.id DESC` | Newest first; unique and immutable, unlike `timestamp` |
| `LIMIT ?` | Bounded page size |

`messages.timestamp` is a locale display string (`25/04/22 7:36:20 PM`), so it cannot
be used for chronological ordering. `id` is insertion order and the primary key.

### 8.2 Count statement

```sql
SELECT COUNT(*) AS total
FROM messages_fts
JOIN messages m ON m.id = messages_fts.rowid
WHERE messages_fts MATCH ?
    AND m.chat_id = ?
    AND m.type IN ('text', 'link');
```

Used only for the first page:

```js
total: beforeId ? null : this.chatRepository.countChatMessages(chat_id, matchQuery)
```

### 8.3 Limit clamping

```js
function clampLimit(limit, fallback, max) {
    const requested = Number(limit ?? fallback);
    if (!Number.isFinite(requested)) return fallback;
    return Math.min(Math.max(Math.trunc(requested), 1), max);
}
```

Real bugs it fixes:

| Input | Naive behavior | Problem |
|---|---|---|
| `0` | `Number(0) || 50` → 50 | explicit zero became a full page |
| `2.7` | SQLite `datatype mismatch` | `LIMIT` requires an integer |

Final behavior: `0→1`, `2.7→2`, `-5→1`, `9999→100`, `"abc"→50`, `null/undefined→50`.

### 8.4 Older pagination

```sql
SELECT * FROM (
    SELECT * FROM messages
    WHERE chat_id = ? AND id < ?
    ORDER BY id DESC
    LIMIT 100
) AS subquery
ORDER BY id ASC;
```

The inner query walks backwards from the cursor; the outer query restores display
order.

### 8.5 Newer pagination

```sql
SELECT * FROM messages
WHERE chat_id = ? AND id > ?
ORDER BY id ASC
LIMIT 100;
```

No subquery needed: ascending is already display order.

### 8.6 Centered jump window

```sql
-- older half, descending so the newest rows are taken first
SELECT * FROM messages
WHERE chat_id = ? AND id <= ?
ORDER BY id DESC
LIMIT ?;

-- newer half
SELECT * FROM messages
WHERE chat_id = ? AND id > ?
ORDER BY id ASC
LIMIT ?;
```

```js
findMessageWindow(chat_id, messageId, limit = 100) {
    const total = clampLimit(limit, 100, 200);
    const olderTarget = Math.ceil(total / 2); // includes the target
    const newerTarget = total - olderTarget;

    const older = this.windowOlderStmt.all(chat_id, messageId, olderTarget + 1);
    const hasOlder = older.length > olderTarget;

    const newer = this.windowNewerStmt.all(chat_id, messageId, newerTarget + 1);
    const hasNewer = newer.length > newerTarget;

    return {
        messages: [
            ...older.slice(0, olderTarget).reverse(),
            ...newer.slice(0, newerTarget),
        ],
        hasOlder,
        hasNewer,
    };
}
```

The `+1` row is a probe: it answers "is there more on this side?" and is not
rendered. This replaced an earlier window that ended at the target, which made
scrolling below a hit impossible.

---

## 9. Pagination: OFFSET vs cursor

### 9.1 Definitions

**OFFSET**

```sql
ORDER BY id DESC LIMIT 50 OFFSET 500
```

SQLite produces 550 ordered rows and discards 500.

**Keyset / cursor**

```sql
WHERE id < :lastSeenId ORDER BY id DESC LIMIT 50
```

The cursor is a value, not a position.

### 9.2 Requirements for keyset pagination

1. A **unique** sort key — otherwise rows can be skipped or repeated.
2. An **immutable** key — IDs qualify; timestamps do not.
3. A stable direction and comparison (`id < cursor` for newest-first).

With relevance ordering the key would be `(rank, id)`, where `rank` is a computed
float and ties need exact equality. That is possible but awkward, and `bm25()` must
be evaluated twice because SQL aliases cannot be referenced in `WHERE`.

### 9.3 Query plans

```text
cursor:
    SEARCH m USING INDEX idx_messages_chat_id_id (chat_id=? AND id<?)
    SCAN messages_fts VIRTUAL TABLE INDEX 0:=M1
    (no temp sort)

offset:
    SCAN messages_fts VIRTUAL TABLE INDEX 0:M1
    SEARCH m USING INTEGER PRIMARY KEY (rowid=?)
    USE TEMP B-TREE FOR ORDER BY      ← materialize + sort all matches
```

The cursor plan avoids the sort step entirely.

### 9.4 Correctness under writes

| Event between page 1 and page 2 | Cursor | OFFSET |
|---|---|---|
| New message inserted | Page 2 unaffected | Every page shifts; a row can repeat |
| Older message deleted | Page 2 unaffected | A row can be skipped |
| Concurrent import | Stable | Unstable |

OFFSET is only strictly correct on an immutable snapshot.

### 9.5 When to use which

| Use OFFSET when | Use cursor when |
|---|---|
| Data is static | Data changes while paging |
| Result set is small or pages are shallow | Tables are large |
| Ordering is relevance-based with no cheap unique key | A unique, immutable, indexed key exists |
| One-off report/admin query | Infinite scroll or "show more" |

### 9.6 Measured numbers

50,000 messages, 16,667 matches, page size 50, in-memory database, medians:

| Query | Median |
|---|---|
| cursor, first page | 172 ms |
| cursor, bound 30000 | 120 ms |
| cursor, bound 10000 | 39 ms |
| cursor, bound 1000 | 10 ms |
| OFFSET 0 | 168 ms |
| OFFSET 1000 | 195 ms |
| OFFSET 5000 | 204 ms |
| OFFSET 10000 | 202 ms |

Honest reading:

- The first page is a tie; FTS matching dominates.
- Cursor cost scales with the **ID bound**, not the page number.
- OFFSET cost scales with depth and then flattens.
- On a 5k-message chat a page measured roughly 70–90 ms; normal chats are smaller.

A specific speedup should not be claimed. The defensible statement is: the cursor
removes the temp sort and the positional-skip failure mode.

### 9.7 Counting once

`COUNT(*)` still walks all matches. It is cheap relative to a page (3–20 ms in the
large fixture) but pointless to repeat for every "show more". The service returns
`total: null` for cursor pages and the client keeps the first value.

---

## 10. API surface

### 10.1 Service and repository

`chatServices`

| Method | Signature | Returns |
|---|---|---|
| `searchMessages` | `(chat_id, rawQuery, limit = 50, beforeId = null)` | `{ results, total }` |
| `getMessageWindow` | `(chat_id, messageId, limit = 100)` | `{ messages, hasOlder, hasNewer }` |
| `loadNewerMessages` | `(chat_id, cursorId)` | `Array<Message>` |
| `loadMessages` | `(chat_id, cursorId)` | `Array<Message>` (older, pre-existing) |

`chatRepository`

| Method | Signature | Returns |
|---|---|---|
| `searchChatMessages` | `(chatId, matchQuery, limit = 50, beforeId = null)` | result rows |
| `countChatMessages` | `(chatId, matchQuery)` | `number` |
| `findMessageWindow` | `(chat_id, messageId, limit = 100)` | `{ messages, hasOlder, hasNewer }` |
| `loadNewerMessages` | `(chat_id, cursorId)` | `Array<Message>` |

### 10.2 IPC channels

| Channel | Handler | Returns |
|---|---|---|
| `search-messages` | `chatService.searchMessages` | `{ results, total }` |
| `get-message-window` | `chatService.getMessageWindow` | `{ messages, hasOlder, hasNewer }` |
| `load-newer-messages` | `chatService.loadNewerMessages` | `Array<Message>` |
| `load-messages` | `chatService.loadMessages` | `Array<Message>` |

Error containment:

```js
ipcMain.handle("search-messages", (_, chatId, rawQuery, limit, beforeId) => {
    try {
        return chatService.searchMessages(chatId, rawQuery, limit, beforeId);
    } catch (error) {
        console.error("[search-messages]", error);
        return { results: [], total: 0 };
    }
});
```

The renderer never receives a rejected promise or raw SQL text from search.

### 10.3 Preload and renderer wrappers

Preload exposes named functions only; the renderer never sees `ipcRenderer`.
`electronApi.js` adds a fallback so browser-only Vite development does not crash:

```js
if (!window.api?.searchMessages) {
  return Promise.resolve({ results: [], total: 0 });
}
```

### 10.4 Why parsing lives in the service

- No caller can accidentally pass raw text to `MATCH`.
- The behavior is testable without Electron or React.
- `null` becomes `[]` in exactly one place.
- The IPC handler remains transport-only.

---

## 11. Renderer design

### 11.1 `useChatSearch`

Owns query, results, total, paging, debounce. Two derivation patterns make it
lint-clean and effect-free for resets.

**Tag state with the entity**

```js
const query = queryState.chatId === chatId ? queryState.value : '';
const current = state.chatId === chatId ? state : EMPTY;
```

Switching chats clears the query and results by derivation — no reset effect, no
cascading render.

**Tag results with the query**

```js
const status = tooShort
    ? 'idle'
    : current.query === trimmed
      ? current.status
      : 'loading';
```

"Loading" is computed from "the results do not belong to this query yet", instead of
being written with `setState` inside an effect body.

**Debounce and cancellation**

```js
useEffect(() => {
    if (!active || tooShort) return;
    if (current.query === trimmed && current.status === 'done') return;

    let cancelled = false;
    const timer = setTimeout(() => {
        searchMessages(chatId, trimmed, SEARCH_PAGE_SIZE)
            .then((payload) => {
                if (cancelled) return;
                setState({ chatId, query: trimmed, rows: payload?.results ?? [], total: payload?.total ?? 0, status: 'done' });
            })
            .catch(() => {
                if (cancelled) return;
                setState({ chatId, query: trimmed, rows: [], total: 0, status: 'error' });
            });
    }, 250);

    return () => {
        cancelled = true;
        clearTimeout(timer);
    };
}, [active, chatId, current.query, current.status, trimmed, tooShort]);
```

- 250 ms debounce.
- `cancelled` prevents a stale response from overwriting newer results.
- Reopening the panel with the same query keeps loaded pages.
- Queries only run while the panel is open (`active`).

**Cursor paging with a guard**

```js
const older = payload?.results ?? [];

setState((previous) => {
    if (previous.chatId !== chatId || previous.query !== trimmed) return previous;

    const seen = new Set(previous.rows.map((row) => row.id));
    return {
        ...previous,
        rows: [...previous.rows, ...older.filter((row) => !seen.has(row.id))],
        total: payload?.total ?? previous.total,
    };
});
```

The guard drops a page that finished after the query or chat changed; de-duplication
covers overlapping requests.

### 11.2 `ChatSearch`

Presentational only. Receives query, status, results, total, `hasMore`,
`loadingMore`, and callbacks. Benefits:

- One owner of search state.
- Results survive closing the panel.
- The arrows and the list share the same data.

Snippet rendering turns `\u0001` / `\u0002` into React nodes, never HTML:

```jsx
text.split('\u0001').map((chunk, index) => {
    if (index === 0) return <span key={index}>{chunk}</span>;
    const [highlight, rest = ''] = chunk.split('\u0002');
    return <span key={index}><mark>{highlight}</mark>{rest}</span>;
});
```

Because snippets render as text nodes, no message content can inject markup.

### 11.3 `ChatView` composition

```text
showInfo  → ChatInfo
else searchOpen → ChatSearch
else            → messages + footer
```

Search is keyed by chat ID so the panel remounts per conversation. The search
session (`{ query, index }`) and the open/closed state reset synchronously during
render when the chat changes, using React's documented "adjust state during render"
pattern.

### 11.4 Arrows

```js
const stepSearchResult = async (delta) => {
    if (!searchSession || searchSession.query !== search.trimmed) return;

    const nextIndex = searchSession.index + delta;
    if (nextIndex < 0) return;

    let hit = search.results[nextIndex];

    if (!hit) {
        if (delta < 0 || !search.hasMore || search.loadingMore) return;
        const added = await search.loadMore();
        hit = added[0];
        if (!hit) return;
    }

    setSearchSession({ query: search.trimmed, index: nextIndex });
    jumpToMessage?.(hit.id);
};
```

- The session is tied to the query; editing the query hides the arrows instead of
  pointing at a stale list.
- At the boundary the next result page loads automatically.
- The counter uses the **true total** (`search.total`), not the loaded count.

### 11.5 Jump window and scroll pinning

`ChatView` already had a `ResizeObserver` that keeps the viewport pinned to the
newest message while media loads. That fights a jump: images below the target load,
content grows, and the viewport is dragged away.

Pinning is therefore a ref, toggled without re-rendering:

```js
useEffect(() => {
    if (!focusMessageId) return;

    isPinnedToBottom.current = false;

    const target = scrollDivContainer.current?.querySelector(
        `[data-message-id="${focusMessageId}"]`
    );
    target?.scrollIntoView({ block: 'center' });
}, [focusMessageId]);

useEffect(() => {
    if (focusMessageId || !isPinnedToBottom.current) return;
    const container = scrollDivContainer.current;
    if (container) container.scrollTop = container.scrollHeight;
}, [focusMessageId, messages]);
```

### 11.6 Scrolling in both directions

```js
const handleScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    isPinnedToBottom.current = distanceFromBottom < 80;

    if (scrollTop === 0 && hasMore && !isLoadingMore) {
        setOldScrollHeight(scrollHeight);
        setIsLoadingMore(true);
        loadMore(selectedChat.id);
    }

    if (distanceFromBottom < 120 && hasNewer && !loadingNewer) {
        loadNewer?.();
    }
};
```

- Top edge loads older messages (pre-existing behavior).
- Bottom edge loads newer messages only after a jump (`hasNewer` is false in normal
  mode); `loadNewer` appends and stops when a page is short.
- Older pagination preserves scroll position by comparing `scrollHeight` before and
  after; newer pagination needs no adjustment because content grows below.

### 11.7 Highlight

- `data-message-id` on the row for `querySelector`.
- `ring-2 ring-[#53bdeb]` on the bubble — a box-shadow, so no layout shift.
- A subtle row tint behind the bubble.

---

## 12. End-to-end flows

### 12.1 Search

```text
type "C++ notes"
 → trim, length ≥ 2
 → status derived "loading"
 → 250 ms debounce
 → IPC search-messages
 → buildMatchQuery → '"C++" "notes"*'
 → SQL: MATCH + chat + type + id < MAX + LIMIT 50
 → snippet() reads messages
 → page 1 also computes COUNT(*)
 → { results, total }
 → panel renders count and marked snippets
```

### 12.2 Jump

```text
click result index i
 → panel closes, session { query, index: i }
 → IPC get-message-window
 → 50 rows at/before target + 50 after
 → { messages, hasOlder, hasNewer }
 → useMessages replaces the list, sets focus
 → ChatView disables pinning, centers target, rings it
 → bar shows i+1 / total with arrows
```

### 12.3 Scroll down after a jump

```text
scroll to bottom
 → hasNewer true → IPC load-newer-messages(lastId)
 → append next 100 rows
 → repeat until a short page sets hasNewer false
```

### 12.4 Back to latest

```text
click Back to latest
 → pinning on
 → session cleared
 → IPC get-messages (newest 100)
 → highlight and arrows disappear
```

---

## 13. Edge cases

| Case | Behavior |
|---|---|
| Query under 2 characters | No IPC call; panel shows a hint |
| Query of only punctuation/emoji | Parser returns `null`; no query |
| `C++`, `AND`, `don't`, quotes | Quoted as literals |
| Unmatched quote | Treated as a separator |
| 300-character paste | Truncated to 256 |
| `LIMIT 0`, `2.7`, negative, `"abc"` | Clamped to 1 / 2 / 1 / 50 |
| Chat switched while searching | Query/state cleared by derivation; response discarded |
| Chat switched while jumping | `chatIdRef` guard discards the response |
| Double-click on `Show more` | Stale-cursor guard prevents duplicates |
| Query edited after a jump | Arrows hidden (session query mismatch) |
| Hit is the first message | `hasOlder: false` |
| Hit is the last message | `hasNewer: false` |
| `file` / `system` / media rows | Excluded from results |
| Message deleted between search and jump | Target may be absent; window still renders around the ID |
| Deleting a chat | FK cascade deletes messages; delete trigger clears index |
| Reopening the panel | Same query keeps loaded pages and position |
| IPC error | Handler returns `{ results: [], total: 0 }` |

---

## 14. Testing

### 14.1 `test/searchQuery.test.js`

| Test | Proves |
|---|---|
| Exact output for 14 inputs | quoting, prefix, phrases, stray quotes, hyphens |
| Bidi stripping | WhatsApp artifacts do not break queries |
| Unusable input → `null` | empty, short, punctuation, `null`, `undefined` |
| Length cap | no unbounded MATCH strings |
| Every output runs against real FTS5 | grammar correctness, not just string equality |
| `C++` / `AND` / case variants return literal matches | semantics, not just parse success |

### 14.2 `test/search.test.js`

| Test | Proves |
|---|---|
| Chat scoping + total | `m.chat_id` isolation |
| File/system excluded | `type IN` filter |
| Newest-first ordering | chronological contract |
| Snippet markers | `snippet()` output contract |
| Prefix matching | last-token `*` |
| Update/delete sync | triggers |
| Cascade delete | FK + delete trigger |
| Hostile strings | service never throws |
| Limit clamping | 0 / 2.7 / -5 / 9999 / "abc" |
| Cursor paging | 3 pages × 50, no gaps, no repeats |
| Centered window | target at index 49 of 100 |
| Window edges | `hasOlder` / `hasNewer` at both ends |
| Newer paging | stays in chat, no overlap, contiguous |

### 14.3 Why real SQLite

The tests use an in-memory database with the real schema, repository, and service.
Mocking SQL would have hidden every real bug found here: the wrong `content=`
value, the table-name mismatch, `LIMIT` type errors, and FTS grammar failures.

### 14.4 Fixture note

Setup uses `ChatRepository` from `schema.js` (writes: `createChat`, `insertBatch`),
while queries use `chatRepository` from `chatRepository.js` (reads). They are
separate classes on purpose; mixing them fails with `repo.createChat is not a function`.

---

## 15. Benchmarks and methodology

### 15.1 What was measured

- 5,000 and 50,000 message fixtures, one third matching.
- Page size 50.
- In-memory SQLite, better-sqlite3.
- Warm-up runs, medians, interleaved variants.

### 15.2 What went wrong

1. An early single run suggested a 13× cursor win; it did not reproduce.
2. A later single run suggested cursor was slower; it also did not reproduce.
3. A claim that the cursor "stops after 50 rows" was contradicted by a scaling test
   showing cost grows with the ID bound.

Lesson: do not publish a single benchmark run. Report medians, interleave variants,
and state what dominates. Here, FTS matching dominates and the paging mechanism is
secondary; the design choice rests on the plan and correctness, not a multiplier.

### 15.3 Plan reading

```text
SEARCH m USING INDEX idx_messages_chat_id_id (chat_id=? AND id<?)
SCAN messages_fts VIRTUAL TABLE INDEX 0:=M1
```

means the outer loop walks `messages` through the composite index and the FTS table
is probed per row.

```text
SCAN messages_fts VIRTUAL TABLE INDEX 0:M1
SEARCH m USING INTEGER PRIMARY KEY
USE TEMP B-TREE FOR ORDER BY
```

means every match is gathered and sorted before the limit applies.

---

## 16. React constraints learned

| Rule | Trigger | Fix |
|---|---|---|
| No synchronous `setState` in an effect body | `react-hooks/set-state-in-effect` | derive loading/status from tagged state |
| No ref writes during render | `react-hooks/refs` | sync refs in an effect |
| Tag state with its entity | avoids reset effects on chat switch | `state.chatId === chatId ? state : EMPTY` |
| Tag results with the query | makes loading derivable | `current.query === trimmed` |
| Adjust state during render for prop-driven resets | documented React pattern | `if (prev !== next) { setPrev(next); … }` |
| Use refs for scroll pinning | toggling must not re-render | `isPinnedToBottom.current` |
| Guard stale async work | fast typing, chat switches | `cancelled` flags and ID comparisons |

---

## 17. Bugs found during the work

| Bug | Symptom | Root cause | Lesson |
|---|---|---|---|
| `content = 'message'` | table created, then `rebuild` failed with `no such table: main.message`; `snippet()` failed | `content` takes a **table** name, not the column | read the DDL contract, test `snippet()` early |
| Table named `messages_fts`, triggers used `message_fts` | `createSchema` passed, then inserts failed `no such table: main.message_fts`; repository construction failed | SQLite does not validate trigger bodies at creation | a passing schema creation is not proof of correctness |
| `LIMIT 0` returned 50 | `Number(limit) \|\| 50` | `0` is falsy | clamp explicitly, do not use `\|\|` for numeric defaults |
| `LIMIT 2.7` threw | SQLite requires an integer | truncate in `clampLimit` |
| Jump window ended at the target | could only scroll up | window semantics | context must exist on both sides |
| Benchmark flip-flops | contradictory performance claims | single noisy runs | medians, interleaving, and plans |

---

## 18. Limitations and future work

| Area | Current | Next step |
|---|---|---|
| Global search | Not built | Drop `m.chat_id = ?`, add bm25 ranking and cross-chat result groups |
| Ranking | Chronological | `ORDER BY bm25`; cursor becomes `(rank, id)` or accept OFFSET |
| Sender/date filters | Not indexed | New FTS columns or filters on `messages` |
| Term highlight inside bubbles | Ring + tint only | Split message text around query tokens in `ChatMessage` |
| Phrase UI | Parser supports quotes, UI does not advertise | Placeholder hint or a toggle |
| Emoji search | Impossible with `unicode61` | Different tokenizer or a separate column |
| Prefix index | None | `prefix='2 3'`, at the cost of space |
| Migrations | None | `PRAGMA user_version` + `INSERT INTO messages_fts(messages_fts) VALUES('rebuild')` |
| Search history | None | Persist recent queries |
| Exact `hasMore` for initial load | `length >= 100` heuristic | `EXISTS` query |
| Word-in-message navigation | Arrows move between messages | Match offsets per message |

---

## 19. File map

| Path | Role |
|---|---|
| `src/db/schema.js` | Tables, FTS5 table, triggers, chat index |
| `src/db/chatRepository.js` | Search, count, windows, older/newer paging, clamp |
| `src/services/chatService.js` | Parsing + payload composition |
| `src/parser/searchQuery.js` | Raw text → safe FTS5 expression |
| `src/parser/messageParser.js` | `stripInvisibleMarks`, existing parsing |
| `electron/ipc/chatHandlers.js` | IPC channels and error containment |
| `electron/preload.js` | `contextBridge` API |
| `renderer/src/api/electronApi.js` | Renderer wrappers with fallbacks |
| `renderer/src/hooks/useChatSearch.js` | Search state, debounce, paging, total |
| `renderer/src/hooks/useMessages.js` | Message list, jump window, older/newer |
| `renderer/src/components/chat/ChatSearch.jsx` | Search panel (presentational) |
| `renderer/src/components/chat/ChatView.jsx` | Panel switching, arrows, scroll |
| `renderer/src/components/chat/ChatHeader.jsx` | Search toggle |
| `renderer/src/components/chat/ChatMessage.jsx` | Highlight ring and row tint |
| `renderer/src/components/chat/ChatWindow.jsx` | Wires hook state into the view |
| `test/searchQuery.test.js` | Parser unit + FTS acceptance |
| `test/search.test.js` | Repository/service integration |

---

## 20. Glossary

| Term | Meaning |
|---|---|
| **FTS5** | SQLite's full-text search module (virtual table) |
| **Inverted index** | Mapping from term to the list of documents containing it |
| **Postings list / doclist** | The list of document IDs for one term |
| **Virtual table** | A table whose storage and query logic are implemented by a module |
| **External content** | FTS mode storing only the index, reading text from another table |
| **Shadow table** | Internal table created and managed by FTS5 |
| **Tokenizer** | Splits text into searchable terms |
| **Prefix query** | `term*` — matches terms starting with that text |
| **bm25** | Standard relevance ranking function; negative scores in SQLite |
| **snippet** | Function returning a marked excerpt around a match |
| **Keyset pagination** | Paging by a value (cursor) rather than by position |
| **OFFSET** | Position-based skip; cost grows with depth |
| **Covering index** | An index that satisfies a query without touching the table |
| **Query plan** | SQLite's chosen execution strategy (`EXPLAIN QUERY PLAN`) |
| **Temp B-tree** | Temporary sort structure created when no index provides order |

---

## 21. FAQ: why this, why not that

**Why FTS5 instead of `LIKE`?**
`LIKE '%x%'` cannot use an index, cannot rank, cannot snippet, and matches substrings
rather than words. FTS5 provides all four and reuses the same index for future global
search.

**Why one index for all chats?**
Filtering by `chat_id` is a single predicate. Per-chat tables would multiply schema
objects, complicate deletion, and make cross-chat search a union of many tables.

**Why external content?**
It avoids storing message text twice and keeps `messages` authoritative. The cost is
that `snippet()` must read `messages`.

**Why triggers instead of application inserts?**
Every write path (import, future edit, future delete) would have to remember to update
the index. Triggers make synchronization structural.

**Why quote every token?**
`MATCH` is a grammar. Quoting is the only way to make `C++`, `AND`, `don't`, and
hyphenated words literal without deleting characters the user typed.

**Why prefix only the last token?**
Users type left to right; the last word is the one still being formed. Prefixing every
token multiplies candidate scans for little benefit.

**Why is `id` the chronological key and not `timestamp`?**
`timestamp` is a locale-formatted display string. `id` is monotonic insertion order and
the primary key, which also makes it a valid pagination cursor.

**Why newest-first instead of relevance?**
It matches WhatsApp's in-chat search behavior and enables a simple, unique keyset. The
first version used `bm25`; it forced a full sort of every match and made pagination
awkward.

**Why not add ranking back?**
For global search, ranking becomes valuable. In a single conversation, recency is the
more useful order, and the user is already filtering by chat.

**Why a cursor instead of OFFSET?**
Stability under writes and no positional skip. The query plan also avoids a temporary
sort. No fixed speedup is claimed; FTS matching dominates.

**Why pass `MAX_SAFE_INTEGER` on page 1?**
It lets the first page use the same `id < ?` statement and plan as later pages, instead
of maintaining a second unbounded statement.

**Why count only once?**
`COUNT(*)` scans all matches. The client can retain the first value across `Show more`.

**Why is the jump window centered?**
An earlier version ended at the target, so there was nothing below the hit to scroll to.
Half the rows go before the hit (including it), half after.

**Why `+1` probe rows?**
One extra row answers "is there more on this side?" without a separate query, and is
not rendered.

**Why 50 results and 100 messages?**
50 keeps the panel list and IPC payload small; 100 gives enough chat context to read
around a hit. Both are clamped server-side.

**Why is search state not inside the panel?**
The panel unmounts when closed. Results must survive so arrows and `Show more` keep
working, and so reopening restores the query.

**Why duplicate the 2-character minimum in the renderer?**
Importing `searchQuery.js` would pull `messageParser.js` and its Node-only dependencies
into the renderer bundle. The server remains authoritative; the UI copy is a hint.

**Why no migrations?**
The database is disposable and re-importable. A migration system would add complexity
without protecting data that cannot be regenerated.

**Why do the arrows move between messages, not words?**
Each search result is a message. Word-level traversal would need match offsets per
message and a different highlight implementation.

**Why does `SELECT count(*) FROM messages_fts` not prove the index is populated?**
With external content it can mirror the row count of `messages`. Verify with `MATCH`,
not with `count(*)`.

**Why not use `INSERT OR REPLACE` when importing?**
`REPLACE` performs a delete that does not fire the FTS delete trigger, leaving stale
index entries. Use plain `INSERT`, or delete explicitly.

---

## Appendix: commit history for this feature

| Commit | Message |
|---|---|
| `f0674bf` | Document FTS schema in `createSchema` JSDoc |
| `c420f29` | Add in-chat message search query backed by FTS5 |
| `adfea4b` | Add in-chat full-text search with jump to result |
| `a9d963b` | Add arrow navigation between in-chat search results |
| `574f3d7` | Page search results by ID cursor with show more |
| `e305160` | Load messages on both sides of a search jump |

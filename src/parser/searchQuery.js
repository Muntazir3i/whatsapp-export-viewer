/**
 * @file searchQuery.js
 * @description Converts raw search-box input into a safe FTS5 `MATCH` expression.
 *
 * FTS5 `MATCH` does not accept plain text: quotes, `*`, `-`, `:`, `{}`, `^`, and
 * the boolean keywords (`AND`, `OR`, `NOT`) are parsed as query syntax. Quoting
 * every token turns the input into literal terms, which keeps `C++`, `AND`, and
 * `don't` searchable instead of raising a syntax error.
 */

import { stripInvisibleMarks } from "./messageParser.js";

/** Shortest trimmed query worth running; mirrors the search box minimum. */
export const MIN_QUERY_LENGTH = 2;

/** Longest accepted input; a search box never needs a full message length. */
const MAX_QUERY_LENGTH = 256;

/** A closed quoted phrase, or a single non-whitespace word. */
const TOKEN_PATTERN = /"([^"]*)"|(\S+)/g;

/** Tokens with no letter or digit cannot match anything (emoji, punctuation). */
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

/**
 * Splits sanitized input into literal search tokens.
 *
 * Closed quotes group a phrase into one token. A stray quote is treated as a
 * word separator, so `say "hi` searches for `say` and `hi`.
 *
 * @param {string} text - Input after removing invisible marks and trimming length.
 * @returns {string[]} Tokens that contain at least one letter or digit.
 */
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

/**
 * Wraps a token as an FTS5 string literal, escaping quotes by doubling them.
 *
 * @param {string} token - Literal text to match.
 * @returns {string} Quoted FTS5 term.
 */
function quoteToken(token) {
    return `"${token.replaceAll('"', '""')}"`;
}

/**
 * Builds the `MATCH` expression for a raw search query.
 *
 * Every token is quoted so punctuation matches literally, and the final token
 * gets a `*` suffix so the last word behaves as a prefix while typing.
 *
 * @param {string} raw - Text typed into the search box.
 * @returns {string|null} FTS5 expression, or `null` when the query is not searchable.
 */
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

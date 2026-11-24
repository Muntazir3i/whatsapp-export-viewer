import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { buildMatchQuery } from "../src/parser/searchQuery.js";
import { createSchema } from "../src/db/schema.js";

/** Raw input and the exact MATCH expression it should produce. */
const CASES = [
    ["quick brown", '"quick" "brown"*'],
    ["  quick   brown  ", '"quick" "brown"*'],
    ["C++", '"C++"*'],
    ["AND", '"AND"*'],
    ["OR", '"OR"*'],
    ["NOT", '"NOT"*'],
    ["don't", '"don\'t"*'],
    ["3.14", '"3.14"*'],
    ['"happy birthday"', '"happy birthday"*'],
    ['say "hi"', '"say" "hi"*'],
    ['say "hi', '"say" "hi"*'],
    ["foo-bar", '"foo-bar"*'],
    ["-quick", '"-quick"*'],
    ["quick:", '"quick:"*'],
];

test("buildMatchQuery quotes tokens and prefixes the last one", () => {
    for (const [input, expected] of CASES) {
        assert.equal(buildMatchQuery(input), expected, input);
    }
});

test("buildMatchQuery strips invisible bidi marks", () => {
    assert.equal(buildMatchQuery("\u200Equick\u200F"), '"quick"*');
});

test("buildMatchQuery rejects unusable input", () => {
    for (const input of ["", "   ", "a", "?", "???", "-", '""', null, undefined]) {
        assert.equal(buildMatchQuery(input), null, JSON.stringify(input));
    }
});

test("buildMatchQuery caps very long input", () => {
    const result = buildMatchQuery("x".repeat(500));
    assert.ok(result);
    assert.ok(result.length <= 260, `unexpected length ${result.length}`);
});

test("every produced expression is accepted by FTS5", () => {
    const db = new Database(":memory:");
    createSchema(db);

    db.prepare("insert into chats(name) values ('Search')").run();
    db.prepare(
        `insert into messages(chat_id, sender, message, timestamp, type)
         values (1, 'Ann', ?, '01/01/24 10:00', 'text')`
    ).run("C++ guide, don't panic — quick brown fox and AND gates");

    const search = db.prepare(
        `SELECT m.id
         FROM messages_fts
         JOIN messages m ON m.id = messages_fts.rowid
         WHERE messages_fts MATCH ?
           AND m.chat_id = ?`
    );

    const inputs = [
        ...CASES.map(([input]) => input),
        "???",
        "-",
        "AND OR NOT",
        "NEAR(",
        "*",
        "{}",
        "^^",
    ];

    for (const input of inputs) {
        const matchQuery = buildMatchQuery(input);
        if (!matchQuery) continue;

        assert.doesNotThrow(() => search.all(matchQuery, 1), `${input} -> ${matchQuery}`);
    }

    db.close();
});

test("common punctuation searches match literal text", () => {
    const db = new Database(":memory:");
    createSchema(db);

    db.prepare("insert into chats(name) values ('Search')").run();
    const insert = db.prepare(
        `insert into messages(chat_id, sender, message, timestamp, type)
         values (1, 'Ann', ?, '01/01/24 10:00', 'text')`
    );
    insert.run("using C++ for the parser");
    insert.run("operators like AND and OR are keywords");

    const search = db.prepare(
        `SELECT m.id FROM messages_fts
         JOIN messages m ON m.id = messages_fts.rowid
         WHERE messages_fts MATCH ? AND m.chat_id = ?`
    );

    assert.equal(search.all(buildMatchQuery("C++"), 1).length, 1);
    assert.equal(search.all(buildMatchQuery("AND"), 1).length, 1);
    assert.equal(search.all(buildMatchQuery("and"), 1).length, 1);

    db.close();
});

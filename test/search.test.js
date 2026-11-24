import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createSchema, ChatRepository } from "../src/db/schema.js";
import { chatRepository } from "../src/db/chatRepository.js";
import { chatServices } from "../src/services/chatService.js";

/**
 * Builds an in-memory database with two chats and the repository/service stack.
 *
 * @returns {{
 *   db: Database,
 *   repo: chatRepository,
 *   service: chatServices,
 *   writer: ChatRepository,
 *   chatA: Object,
 *   chatB: Object
 * }}
 */
function createFixture() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createSchema(db);

    // Writes go through the import repository; reads through the query repository.
    const writer = new ChatRepository(db);
    const repo = new chatRepository(db);
    const service = new chatServices(repo);

    const chatA = writer.createChat({ name: "Chat A", file_name: "a.txt" });
    const chatB = writer.createChat({ name: "Chat B", file_name: "b.txt" });

    writer.insertBatch([
        {
            chat_id: chatA.id,
            sender: "Ann",
            message: "the quick brown fox",
            timestamp: "01/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        },
        {
            chat_id: chatA.id,
            sender: "Ann",
            message: "unrelated note about lunch",
            timestamp: "01/01/24 10:05",
            type: "text",
            extension: null,
            category: null,
        },
        {
            chat_id: chatA.id,
            sender: "Ann",
            message: "quick photo",
            timestamp: "01/01/24 10:06",
            type: "file",
            extension: ".jpg",
            category: "image",
        },
        {
            chat_id: chatB.id,
            sender: "Bob",
            message: "quick elsewhere",
            timestamp: "01/01/24 11:00",
            type: "text",
            extension: null,
            category: null,
        },
    ]);

    return { db, repo, service, writer, chatA, chatB };
}

/** Inserts `count` text messages matching `term` and returns the inserted IDs. */
function insertMatches(writer, chatId, term, count, timestamp = "02/01/24 10:00") {
    writer.insertBatch(
        Array.from({ length: count }, (_, index) => ({
            chat_id: chatId,
            sender: "Ann",
            message: `${term} number ${index}`,
            timestamp,
            type: "text",
            extension: null,
            category: null,
        }))
    );
}

const idsOf = (rows) => rows.map((row) => row.id);

test("search is scoped to the requested chat and reports the total", () => {
    const { db, service, chatA, chatB } = createFixture();

    const inA = service.searchMessages(chatA.id, "quick");
    const inB = service.searchMessages(chatB.id, "quick");

    assert.equal(inA.results.length, 1);
    assert.equal(inA.total, 1);
    assert.equal(inA.results[0].sender, "Ann");
    assert.match(inA.results[0].snippet, /quick/);

    assert.equal(inB.results.length, 1);
    assert.equal(inB.total, 1);
    assert.equal(inB.results[0].sender, "Bob");

    db.close();
});

test("search ignores file and system messages", () => {
    const { db, writer, service, chatA } = createFixture();

    writer.insertMessage({
        chat_id: chatA.id,
        sender: null,
        message: "quick system notice",
        timestamp: "01/01/24 10:07",
        type: "system",
        extension: null,
        category: null,
    });

    const { results, total } = service.searchMessages(chatA.id, "quick");

    assert.equal(results.length, 1);
    assert.equal(total, 1);
    assert.equal(results[0].message, undefined);

    db.close();
});

test("results are newest first", () => {
    const { db, writer, service, chatA } = createFixture();

    writer.insertBatch(
        ["oldest match needle", "middle match needle", "newest match needle"].map(
            (message, index) => ({
                chat_id: chatA.id,
                sender: "Ann",
                message,
                timestamp: `03/01/24 10:0${index}`,
                type: "text",
                extension: null,
                category: null,
            })
        )
    );

    const { results } = service.searchMessages(chatA.id, "needle");

    assert.deepEqual(idsOf(results), [...idsOf(results)].sort((a, b) => b - a));

    db.close();
});

test("snippets carry the match markers used by the UI", () => {
    const { db, service, chatA } = createFixture();

    const { results } = service.searchMessages(chatA.id, "brown");

    assert.match(results[0].snippet, /\u0001brown\u0002/);

    db.close();
});

test("the last token is treated as a prefix", () => {
    const { db, service, chatA } = createFixture();

    assert.equal(service.searchMessages(chatA.id, "bro").results.length, 1);
    assert.equal(service.searchMessages(chatA.id, "brow").results.length, 1);

    db.close();
});

test("updates and deletes stay in sync with the index", () => {
    const { db, repo, service, chatA } = createFixture();

    const target = service.searchMessages(chatA.id, "lunch").results[0];
    assert.ok(target);

    db.prepare("UPDATE messages SET message = ? WHERE id = ?").run(
        "dinner plans instead",
        target.id
    );

    assert.equal(service.searchMessages(chatA.id, "lunch").total, 0);
    assert.equal(service.searchMessages(chatA.id, "dinner").total, 1);

    db.prepare("DELETE FROM messages WHERE id = ?").run(target.id);
    assert.equal(service.searchMessages(chatA.id, "dinner").total, 0);

    db.close();
});

test("deleting a chat removes its messages from the index", () => {
    const { db, repo, service, chatA, chatB } = createFixture();

    repo.deleteChat(chatA.id);

    assert.equal(service.searchMessages(chatA.id, "quick").total, 0);
    assert.equal(service.searchMessages(chatB.id, "quick").total, 1);

    db.close();
});

test("hostile query strings never throw through the service", () => {
    const { db, service, chatA } = createFixture();

    for (const query of [
        "C++",
        "AND",
        "OR",
        "NOT",
        "quick-brown",
        "-quick",
        "quick:",
        "{quick}",
        "^quick",
        '"unterminated',
        "*",
        "()",
        "NEAR(",
        "???",
        "",
        "a",
        null,
        undefined,
    ]) {
        assert.doesNotThrow(
            () => service.searchMessages(chatA.id, query),
            String(query)
        );
    }

    db.close();
});

test("limit is clamped and does not change the total", () => {
    const { db, writer, service, chatA } = createFixture();

    insertMatches(writer, chatA.id, "needle", 150);

    assert.equal(service.searchMessages(chatA.id, "needle", 0).results.length, 1);
    assert.equal(service.searchMessages(chatA.id, "needle", 2.7).results.length, 2);
    assert.equal(service.searchMessages(chatA.id, "needle", -5).results.length, 1);
    assert.equal(service.searchMessages(chatA.id, "needle", 9999).results.length, 100);
    assert.equal(service.searchMessages(chatA.id, "needle", "abc").results.length, 50);

    assert.equal(service.searchMessages(chatA.id, "needle", 5).total, 150);

    db.close();
});

test("the ID cursor pages through older matches without gaps or repeats", () => {
    const { db, writer, service, chatA, chatB } = createFixture();

    insertMatches(writer, chatA.id, "needle", 150);
    insertMatches(writer, chatB.id, "needle", 10);

    const first = service.searchMessages(chatA.id, "needle", 50);
    assert.equal(first.results.length, 50);
    assert.equal(first.total, 150);
    assert.equal(first.total, 150, "other chats do not contribute to the total");

    const second = service.searchMessages(chatA.id, "needle", 50, first.results.at(-1).id);
    const third = service.searchMessages(chatA.id, "needle", 50, second.results.at(-1).id);

    assert.equal(second.results.length, 50);
    assert.equal(third.results.length, 50);
    // The total is only counted for the first page; the client keeps it.
    assert.equal(second.total, null);
    assert.equal(third.total, null);

    const collected = [...first.results, ...second.results, ...third.results];
    assert.equal(collected.length, 150);
    assert.equal(new Set(idsOf(collected)).size, 150);

    // Chronological: every page continues below the previous page's cursor.
    for (let i = 1; i < collected.length; i++) {
        assert.ok(collected[i].id < collected[i - 1].id);
    }

    db.close();
});

test("jump window is centered on the target", () => {
    const { db, writer, service, chatA } = createFixture();

    writer.insertBatch(
        Array.from({ length: 300 }, (_, index) => ({
            chat_id: chatA.id,
            sender: "Ann",
            message: `window message ${index}`,
            timestamp: "03/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        }))
    );

    const all = db
        .prepare("SELECT id FROM messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chatA.id);
    const target = all[150].id;

    const window = service.getMessageWindow(chatA.id, target);
    const ids = idsOf(window.messages);

    assert.equal(window.messages.length, 100);
    assert.equal(ids.indexOf(target), 49, "target ends the older half");
    assert.equal(window.hasOlder, true);
    assert.equal(window.hasNewer, true);

    // Oldest-first, 50 on each side of the target.
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
    assert.equal(ids[0], all[101].id);
    assert.equal(ids.at(-1), all[200].id);

    db.close();
});

test("jump window reports which sides have more messages", () => {
    const { db, writer, service, chatA } = createFixture();

    writer.insertBatch(
        Array.from({ length: 300 }, (_, index) => ({
            chat_id: chatA.id,
            sender: "Ann",
            message: `edge message ${index}`,
            timestamp: "03/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        }))
    );

    const all = db
        .prepare("SELECT id FROM messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chatA.id);

    const atFirst = service.getMessageWindow(chatA.id, all[0].id);
    assert.equal(atFirst.hasOlder, false);
    assert.equal(atFirst.hasNewer, true);
    assert.equal(atFirst.messages[0].id, all[0].id);

    const atLast = service.getMessageWindow(chatA.id, all.at(-1).id);
    assert.equal(atLast.hasOlder, true);
    assert.equal(atLast.hasNewer, false);
    assert.equal(atLast.messages.at(-1).id, all.at(-1).id);

    db.close();
});

test("newer messages continue below a jump without leaving the chat", () => {
    const { db, writer, service, chatA, chatB } = createFixture();

    writer.insertBatch(
        Array.from({ length: 250 }, (_, index) => ({
            chat_id: chatA.id,
            sender: "Ann",
            message: `later message ${index}`,
            timestamp: "04/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        }))
    );
    writer.insertBatch(
        Array.from({ length: 5 }, (_, index) => ({
            chat_id: chatB.id,
            sender: "Bob",
            message: `other chat later ${index}`,
            timestamp: "04/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        }))
    );

    const all = db
        .prepare("SELECT id FROM messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chatA.id);
    const target = all[50].id;

    const window = service.getMessageWindow(chatA.id, target);
    const lastLoaded = window.messages.at(-1).id;

    const newer = service.loadNewerMessages(chatA.id, lastLoaded);
    const newerIds = idsOf(newer);

    assert.equal(newer.length, 100);
    assert.ok(newerIds[0] > lastLoaded);
    assert.deepEqual(newerIds, [...newerIds].sort((a, b) => a - b));
    assert.ok(newer.every((row) => row.chat_id === chatA.id));
    assert.equal(new Set([...idsOf(window.messages), ...newerIds]).size, 200);

    db.close();
});

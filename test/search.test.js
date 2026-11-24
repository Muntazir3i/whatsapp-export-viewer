import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createSchema, ChatRepository } from "../src/db/schema.js";
import { chatRepository } from "../src/db/chatRepository.js";
import { chatServices } from "../src/services/chatService.js";

/**
 * Builds an in-memory database with two chats and the repository/service stack.
 *
 * @returns {{ db: Database, repo: chatRepository, service: chatServices, chatA: Object, chatB: Object }}
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

const ids = (rows) => rows.map((row) => row.id).sort((a, b) => a - b);

test("search is scoped to the requested chat", () => {
    const { db, service, chatA, chatB } = createFixture();

    const inA = service.searchMessages(chatA.id, "quick");
    const inB = service.searchMessages(chatB.id, "quick");

    assert.equal(inA.length, 1);
    assert.equal(inB.length, 1);
    assert.match(inA[0].snippet, /quick/);
    assert.equal(inA[0].sender, "Ann");
    assert.equal(inB[0].sender, "Bob");

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

    const results = service.searchMessages(chatA.id, "quick");

    assert.equal(results.length, 1);
    assert.equal(results[0].message, undefined); // file/system rows are excluded

    db.close();
});

test("snippets carry the match markers used by the UI", () => {
    const { db, service, chatA } = createFixture();

    const [result] = service.searchMessages(chatA.id, "brown");

    assert.match(result.snippet, /\u0001brown\u0002/);

    db.close();
});

test("the last token is treated as a prefix", () => {
    const { db, service, chatA } = createFixture();

    assert.equal(service.searchMessages(chatA.id, "bro").length, 1);
    assert.equal(service.searchMessages(chatA.id, "brow").length, 1);

    db.close();
});

test("updates and deletes stay in sync with the index", () => {
    const { db, repo, service, chatA } = createFixture();

    const target = service.searchMessages(chatA.id, "lunch")[0];
    assert.ok(target);

    db.prepare("UPDATE messages SET message = ? WHERE id = ?").run(
        "dinner plans instead",
        target.id
    );

    assert.equal(service.searchMessages(chatA.id, "lunch").length, 0);
    assert.equal(service.searchMessages(chatA.id, "dinner").length, 1);

    db.prepare("DELETE FROM messages WHERE id = ?").run(target.id);
    assert.equal(service.searchMessages(chatA.id, "dinner").length, 0);

    db.close();
});

test("deleting a chat removes its messages from the index", () => {
    const { db, repo, service, chatA, chatB } = createFixture();

    repo.deleteChat(chatA.id);

    assert.equal(service.searchMessages(chatA.id, "quick").length, 0);
    assert.equal(service.searchMessages(chatB.id, "quick").length, 1);

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

test("limit is clamped to a safe range", () => {
    const { db, writer, service, chatA } = createFixture();

    writer.insertBatch(
        Array.from({ length: 150 }, (_, index) => ({
            chat_id: chatA.id,
            sender: "Ann",
            message: `needle number ${index}`,
            timestamp: `02/01/24 10:${String(index % 60).padStart(2, "0")}`,
            type: "text",
            extension: null,
            category: null,
        }))
    );

    assert.equal(service.searchMessages(chatA.id, "needle", 0).length, 1);
    assert.equal(service.searchMessages(chatA.id, "needle", 2.7).length, 2);
    assert.equal(service.searchMessages(chatA.id, "needle", -5).length, 1);
    assert.equal(service.searchMessages(chatA.id, "needle", 9999).length, 100);
    assert.equal(service.searchMessages(chatA.id, "needle", "abc").length, 50);

    db.close();
});

test("message window ends at the target and stays inside the chat", () => {
    const { db, writer, service, chatA, chatB } = createFixture();

    const base = 1000;
    writer.insertBatch(
        Array.from({ length: 150 }, (_, index) => ({
            chat_id: chatA.id,
            sender: "Ann",
            message: `window message ${base + index}`,
            timestamp: "03/01/24 10:00",
            type: "text",
            extension: null,
            category: null,
        }))
    );
    writer.insertMessage({
        chat_id: chatB.id,
        sender: "Bob",
        message: "other chat window message",
        timestamp: "03/01/24 10:00",
        type: "text",
        extension: null,
        category: null,
    });

    const all = db
        .prepare("SELECT id FROM messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chatA.id);
    const target = all[120].id;

    const window = service.getMessageWindow(chatA.id, target);

    assert.equal(window.length, 100);
    assert.equal(window[window.length - 1].id, target);
    assert.ok(window.every((row) => row.chat_id === chatA.id));
    assert.ok(window[0].id > all[0].id);

    // The window must contain the search hit when the same target is searched.
    const expected = ids(all.slice(21, 121));
    assert.deepEqual(ids(window), expected);

    db.close();
});

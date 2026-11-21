import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    classifyMessage,
    isMessageStartLine,
    parseMessageText,
    stripInvisibleMarks,
} from "../src/parser/messageParser.js";
import {
    detectFlavor,
    extractChatFileInfo,
    needsChatName,
    streamChatMessages,
} from "../src/parser/importer.js";

const userDataPath = path.resolve("/tmp/whatsapp-export-viewer-parser-test");
const importsRoot = path.join(userDataPath, "imports");
const mediaDir = path.join(importsRoot, "Anna");

const message = (overrides = {}) => ({
    sender: "Anna",
    message: "hello",
    timestamp: "25/04/22 7:36:20 PM",
    ...overrides,
});

test("isMessageStartLine accepts Android timestamps with locale separators", () => {
    const valid = [
        "12/05/24, 10:16 - Anna: hello",
        "12.05.24, 10:16 - Anna: hello",
        "12-05-24, 10:16 - Anna: hello",
        "16/03/2024, 09:14 - Anna: hello",
        "3/16/2024, 2:32 PM - Anna: hello",
    ];

    for (const line of valid) {
        assert.equal(isMessageStartLine(line, "android"), true, line);
    }

    const continuation = [
        "continuation line",
        "12/05/24 - Anna: hello",
        "hello 12/05/24, 10:16 - inline",
    ];

    for (const line of continuation) {
        assert.equal(isMessageStartLine(line, "android"), false, line);
    }
});

test("isMessageStartLine accepts iOS timestamps with locale separators", () => {
    const valid = [
        "[25/04/22, 7:36:20 PM] Munti: hi",
        "[25.04.22, 19:36:20] Anna: hallo",
        "[25-04-22, 19:36] Anna: hallo",
        "[2022.04.25, 19:36:20] Anna: hallo",
        "[25/04/22, 7:36:20\u202fPM] Munti: hi",
        "\u200e[03/05/22, 1:18:33 AM] S: \u200e<attached: 1.jpg>",
    ];

    for (const line of valid) {
        assert.equal(isMessageStartLine(line, "ios"), true, line);
    }

    const continuation = [
        "continuation line",
        "[quote] not a timestamp",
        "see [25/04/22, 7:36:20 PM] inline",
    ];

    for (const line of continuation) {
        assert.equal(isMessageStartLine(line, "ios"), false, line);
    }
});

test("parseMessageText splits iOS timestamps, senders and attachment marks", () => {
    const parsed = parseMessageText(
        "\u200e[03/05/22, 1:18:33 AM] S: \u200e<attached: 00000010-PHOTO.jpg>",
        "ios"
    );

    assert.deepEqual(parsed, {
        sender: "S",
        message: "<attached: 00000010-PHOTO.jpg>",
        timestamp: "03/05/22 1:18:33 AM",
    });

    const phoneSender = parseMessageText(
        "[25/04/22, 7:36:20 PM] \u200e+1 (555) 123-4567: hi",
        "ios"
    );
    assert.equal(phoneSender.sender, "+1 (555) 123-4567");
});

test("parseMessageText strips bidi marks embedded in iOS bodies and senders", () => {
    const parsed = parseMessageText(
        "\u200e[25/04/22, 7:36:20\u202fPM] \u200eM\u200funti: hello \u200eworld\u200f "
            + "\u202Aleft\u202C \u2066right\u2069 \uFEFFdone",
        "ios"
    );

    assert.deepEqual(parsed, {
        sender: "Munti",
        message: "hello world left right done",
        // The narrow no-break space in the timestamp is a real space, so it stays.
        timestamp: "25/04/22 7:36:20\u202fPM",
    });
});

test("parseMessageText strips bidi marks embedded in Android bodies and senders", () => {
    const parsed = parseMessageText(
        "12/05/24, 10:16 - \u200eAnna\u2069: a\u202eb\u202cc \u200ed\u200f",
        "android"
    );

    assert.deepEqual(parsed, {
        sender: "Anna",
        message: "abc d",
        timestamp: "12/05/24 10:16",
    });
});

test("stripInvisibleMarks keeps joiners and narrow no-break spaces", () => {
    assert.equal(
        stripInvisibleMarks("\u200eA\u200f\u202aB\u202c\u2066C\u2069\ufeff"),
        "ABC"
    );

    // ZWNJ/ZWJ shape Arabic, Indic, and emoji sequences; U+202F is real spacing.
    assert.equal(
        stripInvisibleMarks("a\u200cb\u200dc\u202f"),
        "a\u200cb\u200dc\u202f"
    );
});

test("parseMessageText keeps colons and dashes inside Android message bodies", () => {
    const parsed = parseMessageText(
        "12/05/24, 10:16 - Anna: look - here: ok",
        "android"
    );

    assert.deepEqual(parsed, {
        sender: "Anna",
        message: "look - here: ok",
        timestamp: "12/05/24 10:16",
    });
});

test("classifyMessage treats Android and iOS media placeholders as media", () => {
    const placeholders = [
        "<Media omitted>",
        "image omitted",
        "VIDEO omitted",
        "GIF omitted",
        "Contact card omitted",
        "document omitted",
    ];

    for (const placeholder of placeholders) {
        const result = classifyMessage(
            message({ message: placeholder }),
            mediaDir,
            userDataPath,
            "ios"
        );
        assert.equal(result.type, "media", placeholder);
    }
});

test("classifyMessage resolves iOS <attached: file> and lowercases extensions", () => {
    const result = classifyMessage(
        message({ message: "<attached: 00000010-PHOTO-2022-05-03.JPG>" }),
        mediaDir,
        userDataPath,
        "ios"
    );

    assert.equal(result.type, "file");
    assert.equal(result.extension, ".jpg");
    assert.equal(result.category, "image");
    assert.equal(result.message, "Anna/00000010-PHOTO-2022-05-03.JPG");
});

test("classifyMessage resolves Android (file attached) lines", () => {
    const result = classifyMessage(
        message({ message: "report.PDF (file attached)" }),
        mediaDir,
        userDataPath,
        "android"
    );

    assert.equal(result.type, "file");
    assert.equal(result.extension, ".pdf");
    assert.equal(result.category, "document");
    assert.equal(result.message, "Anna/report.PDF");
});

test("classifyMessage strips the iOS edited marker and its trailing bidi mark", () => {
    const result = classifyMessage(
        message({ message: "new text \u200e<This message was edited>" }),
        mediaDir,
        userDataPath,
        "ios"
    );

    assert.equal(result.type, "text");
    assert.equal(result.message, "new text");
});

test("classifyMessage extracts attachments from iOS quoted replies", () => {
    const result = classifyMessage(
        message({ message: "The original \u2022 <attached: 00000002-PHOTO.jpg>" }),
        mediaDir,
        userDataPath,
        "ios"
    );

    assert.equal(result.type, "file");
    assert.equal(result.category, "image");
    assert.equal(result.message, "Anna/00000002-PHOTO.jpg");
});

test("classifyMessage treats iOS blocked notices as system messages", () => {
    const result = classifyMessage(
        message({ message: "You blocked this person" }),
        mediaDir,
        userDataPath,
        "ios"
    );

    assert.equal(result.type, "system");
});

test("detectFlavor prefers bracketed iOS lines even when the body has a dash", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wev-flavor-"));

    try {
        const cases = [
            {
                name: "ios-first-line-dash.txt",
                lines: [
                    '[25/04/22, 7:36:20 PM] Anna - Work created group "Trip - 2022"',
                    "[25/04/22, 7:36:21 PM] Anna: hi",
                ],
                expected: "ios",
            },
            {
                name: "ios-leading-blank.txt",
                lines: ["", "   ", "[25.04.22, 19:36:20] Anna: hallo"],
                expected: "ios",
            },
            {
                name: "android.txt",
                lines: ["12/05/24, 10:16 - Anna: hello"],
                expected: "android",
            },
            {
                name: "unknown.txt",
                lines: ["this is not a whatsapp export"],
                expected: null,
            },
            {
                name: "empty.txt",
                lines: [],
                expected: null,
            },
        ];

        for (const { name, lines, expected } of cases) {
            const filePath = path.join(dir, name);
            fs.writeFileSync(filePath, lines.join("\n"));
            assert.equal(await detectFlavor(filePath), expected, name);
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("extractChatFileInfo understands Android, iOS and _chat.txt exports", () => {
    assert.deepEqual(extractChatFileInfo("/tmp/WhatsApp Chat - Anna.zip"), [
        "WhatsApp Chat - Anna.zip",
        "Anna",
        false,
    ]);
    assert.deepEqual(extractChatFileInfo("/tmp/WhatsApp Chat with John - Work.zip"), [
        "WhatsApp Chat with John - Work.zip",
        "John - Work",
        false,
    ]);
    assert.deepEqual(extractChatFileInfo("/tmp/WhatsApp Chat - Anna/_chat.txt"), [
        "_chat.txt",
        "Anna",
        false,
    ]);
    assert.deepEqual(extractChatFileInfo("/tmp/whatsapp exports/_chat.txt"), [
        "_chat.txt",
        "_chat",
        true,
    ]);
    assert.deepEqual(extractChatFileInfo("/tmp/download.zip"), [
        "download.zip",
        "download",
        true,
    ]);
});

test("needsChatName asks for a name only when the export is unnamed", () => {
    assert.equal(needsChatName("/tmp/whatsapp exports/_chat.txt"), true);
    assert.equal(needsChatName("/tmp/download.zip"), true);
    assert.equal(needsChatName("/tmp/WhatsApp Chat - Munti.zip"), false);
    assert.equal(needsChatName("/tmp/WhatsApp Chat - Anna/_chat.txt"), false);
    assert.equal(needsChatName("/tmp/WhatsApp Chat with Aatif.txt"), false);
});

test("streamChatMessages parses a CRLF iOS export end to end", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wev-ios-"));

    try {
        const filePath = path.join(dir, "_chat.txt");
        fs.writeFileSync(
            filePath,
            [
                "[25/04/22, 7:36:20\u202fPM] Munti: \u200eMessages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.",
                "[25/04/22, 7:36:20\u202fPM] S: Munti\u200e sohaib here",
                "\u200e[03/05/22, 1:18:33\u202fAM] S: \u200e<attached: 00000010-PHOTO.jpg>",
                "[03/05/22, 1:18:33\u202fAM] Munti: line one",
                "line two\u200f",
                "[25/04/23, 19:36:20] Munti: image omitted",
                "[03/05/22, 1:18:34\u202fAM] Munti: edited\u200e <This message was edited>",
            ].join("\r\n") + "\r\n"
        );

        const flavor = await detectFlavor(filePath);
        assert.equal(flavor, "ios");

        const parsed = [];
        await streamChatMessages(
            path.join(dir, "userdata"),
            filePath,
            flavor,
            async (item) => parsed.push(item)
        );

        assert.equal(parsed.length, 6);
        assert.equal(parsed[0].type, "system");
        assert.equal(parsed[0].sender, null);
        assert.equal(parsed[1].sender, "S");
        assert.equal(parsed[1].message, "Munti sohaib here");
        assert.equal(parsed[2].type, "file");
        assert.equal(parsed[2].category, "image");
        assert.equal(parsed[3].message, "line one\nline two");
        assert.equal(parsed[4].type, "media");
        assert.equal(parsed[4].message, "image omitted");
        assert.equal(parsed[5].type, "text");
        assert.equal(parsed[5].message, "edited");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

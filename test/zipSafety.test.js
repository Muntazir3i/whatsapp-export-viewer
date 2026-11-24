import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import yazl from "yazl";
import { extractZip, isUnsafeZipEntry } from "../src/services/importChat.js";

/** Builds the 32-bit external attributes for a Unix mode. */
function entry(fileName, mode = 0o100644) {
    return {
        fileName,
        externalFileAttributes: (mode << 16) >>> 0,
    };
}

test("isUnsafeZipEntry accepts normal files and directories", () => {
    assert.equal(isUnsafeZipEntry(entry("chat.txt")), false);
    assert.equal(isUnsafeZipEntry(entry("media/photo.jpg")), false);
    assert.equal(isUnsafeZipEntry(entry("media/", 0o040755)), false);
    assert.equal(isUnsafeZipEntry(entry("..foo")), false);
    assert.equal(isUnsafeZipEntry({ fileName: "photo.jpg", externalFileAttributes: 0 }), false);
});

test("isUnsafeZipEntry rejects symlinks, absolute paths, and traversal", () => {
    assert.equal(isUnsafeZipEntry(entry("link", 0o120777)), true);
    assert.equal(isUnsafeZipEntry(entry("/etc/passwd")), true);
    assert.equal(isUnsafeZipEntry(entry("C:\\evil.txt")), true);
    assert.equal(isUnsafeZipEntry(entry("media\\..\\..\\evil.txt")), true);
    assert.equal(isUnsafeZipEntry(entry("../evil.txt")), true);
    assert.equal(isUnsafeZipEntry(entry("media/../../evil.txt")), true);
    assert.equal(isUnsafeZipEntry({}), true);
    assert.equal(isUnsafeZipEntry({ fileName: "" }), true);
});

/** Writes a ZIP with the supplied entries and resolves once it is closed. */
async function writeZip(zipPath, entries) {
    const zip = new yazl.ZipFile();
    for (const item of entries) {
        zip.addBuffer(Buffer.from(item.data), item.name, {
            mode: item.mode ?? 0o100644,
        });
    }
    zip.end();
    await pipeline(zip.outputStream, createWriteStream(zipPath));
}

test("extractZip extracts a normal archive and reports progress", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "wev-zip-"));
    try {
        const zipPath = path.join(root, "chat.zip");
        await writeZip(zipPath, [
            { name: "chat.txt", data: "hello" },
            { name: "media/photo.jpg", data: "image-bytes" },
        ]);

        const outputDir = path.join(root, "out");
        const progress = [];
        await extractZip(zipPath, outputDir, (current, total) => {
            progress.push([current, total]);
        });

        assert.equal(await readFile(path.join(outputDir, "chat.txt"), "utf8"), "hello");
        assert.equal(await readFile(path.join(outputDir, "media/photo.jpg"), "utf8"), "image-bytes");
        assert.equal(progress.at(-1)[0], 2);
        assert.equal(progress.at(-1)[1], 2);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("extractZip rejects a symlink entry before writing through it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "wev-zip-"));
    try {
        const zipPath = path.join(root, "evil.zip");
        await writeZip(zipPath, [
            { name: "media", data: "..", mode: 0o120777 },
            { name: "media/evil.txt", data: "pwned" },
        ]);

        await assert.rejects(
            () => extractZip(zipPath, path.join(root, "out")),
            /Unsafe ZIP entry/
        );
        await assert.rejects(() => readFile(path.join(root, "evil.txt"), "utf8"));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

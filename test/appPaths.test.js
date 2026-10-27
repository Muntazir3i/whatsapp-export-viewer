import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    resolveChatFolder,
    resolveMediaPath,
    toStoredMediaPath,
} from "../src/services/appPaths.js";

const userDataPath = path.resolve("/tmp/whatsapp-export-viewer-test");
const importsRoot = path.join(userDataPath, "imports");

test("resolveMediaPath accepts imports-relative paths", () => {
    assert.equal(
        resolveMediaPath(userDataPath, "Trip/photo.jpg"),
        path.join(importsRoot, "Trip", "photo.jpg")
    );
});

test("resolveMediaPath accepts absolute paths inside imports", () => {
    const absolute = path.join(importsRoot, "Trip", "photo.jpg");
    assert.equal(resolveMediaPath(userDataPath, absolute), absolute);
});

test("resolveMediaPath rejects traversal and paths outside imports", () => {
    const outside = path.resolve(userDataPath, "..", "secret.jpg");

    for (const storedPath of [
        "../../etc/passwd",
        "../imports-evil/secret.jpg",
        "Trip/../../secret.jpg",
        outside,
    ]) {
        assert.equal(resolveMediaPath(userDataPath, storedPath), null, storedPath);
    }
});

test("resolveMediaPath rejects missing or non-string paths", () => {
    assert.equal(resolveMediaPath(userDataPath, ""), null);
    assert.equal(resolveMediaPath(userDataPath, null), null);
    assert.equal(resolveMediaPath(userDataPath, 42), null);
});

test("toStoredMediaPath stores imports-relative paths with forward slashes", () => {
    const absolute = path.join(importsRoot, "Trip", "photo.jpg");
    assert.equal(toStoredMediaPath(userDataPath, absolute), "Trip/photo.jpg");
});

test("toStoredMediaPath keeps paths outside imports absolute", () => {
    const outside = path.resolve(userDataPath, "..", "secret.jpg");
    assert.equal(toStoredMediaPath(userDataPath, outside), outside);
});

test("resolveMediaPath and toStoredMediaPath round-trip", () => {
    const absolute = resolveMediaPath(userDataPath, "Trip/photo.jpg");
    assert.ok(absolute);
    assert.equal(toStoredMediaPath(userDataPath, absolute), "Trip/photo.jpg");
});

test("resolveChatFolder accepts a normal chat name", () => {
    assert.equal(
        resolveChatFolder(userDataPath, "Trip"),
        path.join(importsRoot, "Trip")
    );
});

test("resolveChatFolder rejects names that escape imports", () => {
    const invalidNames = [
        "",
        ".",
        "..",
        "...",
        "../escape",
        "a/b",
        "a\\b",
        path.resolve(userDataPath, ".."),
    ];

    for (const name of invalidNames) {
        assert.throws(
            () => resolveChatFolder(userDataPath, name),
            /Invalid chat name/,
            name
        );
    }
});

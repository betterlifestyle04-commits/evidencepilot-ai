import test from "node:test";
import assert from "node:assert/strict";
import { parseTextImport, MAX_TEXT_IMPORT_CHARACTERS, MAX_TEXT_IMPORT_FILE_BYTES } from "../app/text-import";

const utf8 = (value: string) => new TextEncoder().encode(value);
function fakeFile(name: string, bytes: Uint8Array, declaredSize = bytes.byteLength) {
  return {
    name,
    size: declaredSize,
    arrayBuffer: async (): Promise<ArrayBuffer> => Uint8Array.from(bytes).buffer
  };
}

test("accepts normal UTF-8 text including Arabic, emoji, accents and Markdown", async () => {
  const input = "Factual text: القاهرة، café, 🚀 and [source](https://example.org)\n";
  assert.equal(await parseTextImport(fakeFile("research.md", utf8(input))), input);
});

test("removes UTF-8 BOM without changing the substantive text", async () => {
  const original = "Jupiter is the largest planet.";
  const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8(original)]);
  assert.equal(await parseTextImport(fakeFile("facts.TXT", bytes)), original);
});

test("rejects invalid UTF-8 instead of replacing characters in the input", async () => {
  await assert.rejects(
    () => parseTextImport(fakeFile("claim.txt", Uint8Array.from([0x41, 0xc3, 0x28]))),
    /not valid UTF-8/
  );
});

test("rejects UTF-16 bytes rather than silently importing corrupted text", async () => {
  await assert.rejects(
    () => parseTextImport(fakeFile("claim.txt", Uint8Array.from([0xff, 0xfe, 0x41, 0x00]))),
    /not valid UTF-8/
  );
});

test("rejects binary/control characters while allowing newlines and tabs", async () => {
  await assert.rejects(() => parseTextImport(fakeFile("binary.txt", utf8("A\u0000B"))), /binary or unsupported control/);
  assert.equal(await parseTextImport(fakeFile("table.txt", utf8("A\tB\nC\r\n"))), "A\tB\nC\r\n");
});

test("validates file extensions before reading untrusted bytes", async () => {
  let read = false;
  const f = { name: "secret.pdf", size: 3, arrayBuffer: async () => { read = true; return Uint8Array.from([1,2,3]).buffer; } };
  await assert.rejects(() => parseTextImport(f), /select a \.txt or \.md/);
  assert.equal(read, false);
});

test("rejects advertised and actual files over 60 KB without trusting declared sizes", async () => {
  assert.equal(MAX_TEXT_IMPORT_FILE_BYTES, 60_000);
  const massive = utf8("a".repeat(60_001));
  let read = false;
  await assert.rejects(() => parseTextImport({
    name: "too-big.txt", size: 60_001, arrayBuffer: async () => { read = true; return massive.buffer; }
  }), /too large/);
  assert.equal(read, false);
  await assert.rejects(() => parseTextImport(fakeFile("spoofed.txt", massive, 2)), /too large/);
});

test("enforces the 12,000 character editor limit without truncation", async () => {
  assert.equal(MAX_TEXT_IMPORT_CHARACTERS, 12_000);
  const boundary = "a".repeat(12_000);
  assert.equal((await parseTextImport(fakeFile("boundary.txt", utf8(boundary)))).length, 12_000);
  await assert.rejects(() => parseTextImport(fakeFile("over-limit.txt", utf8(boundary + "x"))), /12,000-character limit/);
});

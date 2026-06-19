import assert from "node:assert/strict";
import test from "node:test";

import { countLines, diffLines, maxLines, splitLines, summarizeDiff } from "../web/diff.js";

test("countLines returns zero for empty input", () => {
  assert.equal(countLines(""), 0);
});

test("countLines counts newline separated content", () => {
  assert.equal(countLines("one"), 1);
  assert.equal(countLines("one\ntwo\nthree"), 3);
});

test("splitLines normalizes CRLF and CR line endings", () => {
  assert.deepEqual(splitLines("one\r\ntwo\rthree"), ["one", "two", "three"]);
});

test("diffLines marks identical lines as unchanged", () => {
  const operations = diffLines(["one", "two"], ["one", "two"]);

  assert.deepEqual(operations, [
    { type: "same", left: "one", right: "one" },
    { type: "same", left: "two", right: "two" },
  ]);
  assert.deepEqual(summarizeDiff(operations), { add: 0, remove: 0, same: 2 });
});

test("diffLines marks added lines", () => {
  const operations = diffLines(["one", "three"], ["one", "two", "three"]);

  assert.deepEqual(operations, [
    { type: "same", left: "one", right: "one" },
    { type: "add", left: "", right: "two" },
    { type: "same", left: "three", right: "three" },
  ]);
});

test("diffLines marks removed lines", () => {
  const operations = diffLines(["one", "two", "three"], ["one", "three"]);

  assert.deepEqual(operations, [
    { type: "same", left: "one", right: "one" },
    { type: "remove", left: "two", right: "" },
    { type: "same", left: "three", right: "three" },
  ]);
});

test("diffLines handles changed blocks between unique anchors", () => {
  const operations = diffLines(
    ["start", "old-a", "old-b", "middle", "tail"],
    ["start", "new-a", "middle", "new-b", "tail"],
  );

  assert.deepEqual(operations, [
    { type: "same", left: "start", right: "start" },
    { type: "remove", left: "old-a", right: "" },
    { type: "remove", left: "old-b", right: "" },
    { type: "add", left: "", right: "new-a" },
    { type: "same", left: "middle", right: "middle" },
    { type: "add", left: "", right: "new-b" },
    { type: "same", left: "tail", right: "tail" },
  ]);
});

test("diffLines supports the configured maximum line count", () => {
  const left = Array.from({ length: maxLines }, (_, index) => `line-${index}`);
  const right = left.slice();
  right[maxLines - 1] = "changed-tail";

  const operations = diffLines(left, right);
  const summary = summarizeDiff(operations);

  assert.equal(operations.length, maxLines + 1);
  assert.deepEqual(summary, { add: 1, remove: 1, same: maxLines - 1 });
});

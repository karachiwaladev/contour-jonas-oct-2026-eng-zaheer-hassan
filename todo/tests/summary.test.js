// domain/summary.js: the "N open · N done" footer text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { footerText } from "../src/domain/summary.js";

const task = (status) => ({ status });

test("footerText: an empty list has no footer", () => {
  assert.equal(footerText([]), "");
});

test("footerText: active and on-hold tasks both count as open", () => {
  assert.equal(footerText([task("active"), task("hold")]), "2 open · 0 done");
});

test("footerText: done tasks count as done", () => {
  assert.equal(footerText([task("done")]), "0 open · 1 done");
});

test("footerText: a mixed list counts open and done separately", () => {
  assert.equal(footerText([task("done"), task("active"), task("hold")]), "2 open · 1 done");
});

test("footerText: a task with an unknown status counts as neither", () => {
  assert.equal(footerText([task("archived"), task("active"), task("__proto__")]), "1 open · 0 done");
});

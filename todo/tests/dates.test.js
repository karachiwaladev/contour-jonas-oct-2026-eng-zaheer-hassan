// Characterisation tests: pin the due-date behaviour shipped in #13
// before it moves out of app.js into src/domain/dates.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dueState } from "../src/domain/dates.js";

const TODAY = "2026-10-26";

test("addDays moves forward and backward across month ends", () => {
  assert.equal(addDays("2026-10-26", 1), "2026-10-27");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
});

test("dueState: no due date has no state", () => {
  assert.equal(dueState({ status: "active", due: "" }, TODAY), "");
});

test("dueState: past due is overdue", () => {
  assert.equal(dueState({ status: "active", due: "2026-10-20" }, TODAY), "overdue");
});

test("dueState: due today or tomorrow is soon", () => {
  assert.equal(dueState({ status: "active", due: TODAY }, TODAY), "soon");
  assert.equal(dueState({ status: "active", due: "2026-10-27" }, TODAY), "soon");
});

test("dueState: further out is later", () => {
  assert.equal(dueState({ status: "active", due: "2026-10-28" }, TODAY), "later");
});

test("dueState: completed tasks are never highlighted", () => {
  assert.equal(dueState({ status: "done", due: "2026-10-20" }, TODAY), "");
});

test("dueState: on-hold tasks still get due states", () => {
  assert.equal(dueState({ status: "hold", due: "2026-10-20" }, TODAY), "overdue");
});

// Characterisation tests: pin task normalisation and tag parsing from #11/#13.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseTags, prepareNewTask } from "../src/domain/tasks.js";

test("normalize: legacy {done:true} becomes Completed", () => {
  const t = normalize({ id: 1, title: "x", done: true });
  assert.equal(t.status, "done");
  assert.equal(t.due, "");
  assert.deepEqual(t.tags, []);
});

test("normalize: legacy {done:false} becomes Active", () => {
  assert.equal(normalize({ id: 1, title: "x", done: false }).status, "active");
});

test("normalize: keeps an explicit status, due date and tags", () => {
  const t = normalize({ id: 2, title: "y", status: "hold", due: "2026-11-01", tags: ["work"] });
  assert.equal(t.status, "hold");
  assert.equal(t.due, "2026-11-01");
  assert.deepEqual(t.tags, ["work"]);
});

test("normalize: tasks saved before #15 do not repeat", () => {
  assert.equal(normalize({ id: 1, title: "x", status: "active" }).repeat, "none");
});

test("normalize: keeps a saved repeat setting", () => {
  assert.equal(normalize({ id: 1, title: "x", repeat: "weekly" }).repeat, "weekly");
});

test("prepareNewTask: a recurring task without a due date is due today", () => {
  const t = prepareNewTask({ title: "Stretch", due: "", tags: [], repeat: "daily" }, "2026-10-26");
  assert.equal(t.due, "2026-10-26");
  assert.equal(t.status, "active");
});

test("prepareNewTask: a one-off task keeps an empty due date", () => {
  assert.equal(prepareNewTask({ title: "Call", due: "", tags: [], repeat: "none" }, "2026-10-26").due, "");
});

test("prepareNewTask: an explicit due date is kept for recurring tasks", () => {
  assert.equal(prepareNewTask({ title: "Rent", due: "2026-11-01", tags: [], repeat: "monthly" }, "2026-10-26").due, "2026-11-01");
});

test("parseTags: lowercases, trims and de-duplicates", () => {
  assert.deepEqual(parseTags("Work, URGENT, work"), ["work", "urgent"]);
});

test("parseTags: ignores empty entries", () => {
  assert.deepEqual(parseTags(" , home,,"), ["home"]);
  assert.deepEqual(parseTags(""), []);
});

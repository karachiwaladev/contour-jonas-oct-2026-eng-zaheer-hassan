// domain/edit.js: applying the inline edit form to a stored task (#18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdit } from "../src/domain/edit.js";

const task = {
  id: 4, title: "Pay rent", status: "hold", due: "2026-11-01", tags: ["home"], priority: "medium",
  repeat: "monthly", repeatDay: 1, nextId: 9, createdAt: 123,
};
const input = (fields) => ({ title: "Pay rent", priority: "medium", due: "2026-11-01", tags: "home", ...fields });

test("applyEdit: updates title, priority, due date and tags", () => {
  assert.deepEqual(applyEdit(task, input({ title: "  Pay the rent ", priority: "high", due: "2026-12-01", tags: "Bills, home, bills" })),
    { ...task, title: "Pay the rent", priority: "high", due: "2026-12-01", tags: ["bills", "home"] });
});

test("applyEdit: a blank title is rejected", () => {
  assert.equal(applyEdit(task, input({ title: "   " })), null);
  assert.equal(applyEdit(task, input({ title: "" })), null);
});

test("applyEdit: never changes id, status, repeat, anchor day, link or creation time", () => {
  const edited = applyEdit(task, input({ id: 1, status: "done", repeat: "none", repeatDay: 5, nextId: 2, createdAt: 0 }));
  assert.deepEqual(edited, task);
});

test("applyEdit: an unknown priority becomes medium", () => {
  assert.equal(applyEdit({ ...task, priority: "high" }, input({ priority: "constructor" })).priority, "medium");
});

test("applyEdit: clearing the due date and tags is allowed", () => {
  const edited = applyEdit(task, input({ due: "", tags: " , " }));
  assert.equal(edited.due, "");
  assert.deepEqual(edited.tags, []);
});

test("applyEdit: does not modify the task it was given", () => {
  const original = { ...task, tags: [...task.tags] };
  applyEdit(original, input({ title: "New", tags: "x" }));
  assert.deepEqual(original, task);
});

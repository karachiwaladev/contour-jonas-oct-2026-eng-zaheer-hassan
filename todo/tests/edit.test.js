// domain/edit.js: applying the inline edit form to a stored task (#18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdit } from "../src/domain/edit.js";
import { completeTask } from "../src/domain/recurrence.js";

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

test("applyEdit: never changes id, status, repeat, link or creation time; keeps the anchor day while the due date is unchanged", () => {
  const edited = applyEdit(task, input({ id: 1, status: "done", repeat: "none", repeatDay: 5, nextId: 2, createdAt: 0 }));
  assert.deepEqual(edited, task);
});

test("applyEdit: an unknown priority becomes medium", () => {
  assert.equal(applyEdit({ ...task, priority: "high" }, input({ priority: "constructor" })).priority, "medium");
});

test("applyEdit: a one-off task may clear its due date and tags", () => {
  const edited = applyEdit({ ...task, repeat: "none", repeatDay: undefined }, input({ due: "", tags: " , " }));
  assert.equal(edited.due, "");
  assert.deepEqual(edited.tags, []);
});

test("applyEdit: does not modify the task it was given", () => {
  const original = { ...task, tags: [...task.tags] };
  applyEdit(original, input({ title: "New", tags: "x" }));
  assert.deepEqual(original, task);
});

test("applyEdit: a repeating task keeps its due date when the field is cleared", () => {
  for (const repeat of ["daily", "weekly", "monthly"]) {
    const edited = applyEdit({ ...task, repeat }, input({ due: "", title: "Rent" }));
    assert.equal(edited.due, "2026-11-01");
    assert.equal(edited.title, "Rent");
    assert.equal(edited.repeatDay, 1);
  }
});

test("applyEdit: moving a monthly task's due date moves its anchor day", () => {
  const edited = applyEdit({ ...task, due: "2026-02-28", repeatDay: 31 }, input({ due: "2026-03-15" }));
  assert.equal(edited.repeatDay, 15);
  const { next } = completeTask(edited, "2026-03-10");
  assert.equal(next.due, "2026-04-15");
  assert.equal(next.repeatDay, 15);
});

test("applyEdit: moving a daily or weekly task's due date adds no anchor day", () => {
  const daily = { id: 1, title: "x", status: "active", due: "2026-11-01", tags: [], priority: "low", repeat: "daily" };
  assert.deepEqual(applyEdit(daily, input({ title: "x", priority: "low", due: "2026-11-20", tags: "" })), { ...daily, due: "2026-11-20" });
});

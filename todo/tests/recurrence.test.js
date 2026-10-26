// Recurring tasks (#15): next-date rules and completing a recurring task.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextDueDate, completeTask, stopRepeating, uncompleteTask } from "../src/domain/recurrence.js";

const TODAY = "2026-10-26"; // a Monday

test("nextDueDate: daily is the next day", () => {
  assert.equal(nextDueDate("2026-10-26", "daily", TODAY), "2026-10-27");
});

test("nextDueDate: weekly is seven days later (same weekday)", () => {
  assert.equal(nextDueDate("2026-10-26", "weekly", TODAY), "2026-11-02");
});

test("nextDueDate: monthly keeps the day of the month", () => {
  assert.equal(nextDueDate("2026-10-26", "monthly", TODAY), "2026-11-26");
});

test("nextDueDate: monthly clamps to the last day of a shorter month", () => {
  assert.equal(nextDueDate("2027-01-31", "monthly", "2027-01-31"), "2027-02-28");
  assert.equal(nextDueDate("2028-01-31", "monthly", "2028-01-31"), "2028-02-29"); // leap year
});

test("nextDueDate: monthly rolls over the year end", () => {
  assert.equal(nextDueDate("2026-12-15", "monthly", "2026-12-15"), "2027-01-15");
});

test("nextDueDate: completed late, skips missed dates to the first one after today", () => {
  assert.equal(nextDueDate("2026-10-20", "daily", TODAY), "2026-10-27");
  assert.equal(nextDueDate("2026-10-12", "weekly", TODAY), "2026-11-02");
  assert.equal(nextDueDate("2026-08-26", "monthly", TODAY), "2026-11-26");
});

test("nextDueDate: completed early still steps from the due date", () => {
  assert.equal(nextDueDate("2026-10-30", "weekly", TODAY), "2026-11-06");
});

test("nextDueDate: no due date counts from today", () => {
  assert.equal(nextDueDate("", "daily", TODAY), "2026-10-27");
});

test("completeTask: a one-off task is just marked done", () => {
  const { completed, next } = completeTask({ id: 1, title: "x", status: "active", due: "", tags: [], repeat: "none" }, TODAY);
  assert.equal(completed.status, "done");
  assert.equal(next, null);
});

test("completeTask: a recurring task is marked done and spawns the next copy", () => {
  const task = { id: 7, title: "Water plants", status: "active", due: "2026-10-26", tags: ["home"], repeat: "weekly", createdAt: 1 };
  const { completed, next } = completeTask(task, TODAY);
  assert.equal(completed.status, "done");
  assert.equal(completed.id, 7);
  assert.deepEqual(next, { title: "Water plants", status: "active", due: "2026-11-02", tags: ["home"], repeat: "weekly" });
});

test("completeTask: an on-hold recurring task also spawns its next copy as active", () => {
  const { next } = completeTask({ id: 2, title: "y", status: "hold", due: TODAY, tags: [], repeat: "daily" }, TODAY);
  assert.equal(next.status, "active");
  assert.equal(next.due, "2026-10-27");
});

// Review fix: monthly keeps the original day of the month after a clamped month.
test("nextDueDate: monthly returns to the anchor day after a short month", () => {
  assert.equal(nextDueDate("2027-02-28", "monthly", "2027-02-28", 31), "2027-03-31");
  assert.equal(nextDueDate("2027-03-31", "monthly", "2027-03-31", 31), "2027-04-30");
});

test("nextDueDate: monthly late completion lands on the anchor day, not a drifted one", () => {
  assert.equal(nextDueDate("2026-08-31", "monthly", TODAY), "2026-10-31");
});

test("completeTask: the next monthly copy carries the anchor day forward", () => {
  const { next } = completeTask({ id: 1, title: "Rent", status: "active", due: "2027-01-31", tags: [], repeat: "monthly" }, "2027-01-31");
  assert.equal(next.due, "2027-02-28");
  assert.equal(next.repeatDay, 31);
  const { next: after } = completeTask({ id: 2, ...next }, "2027-02-28");
  assert.equal(after.due, "2027-03-31");
});

test("completeTask: an unknown repeat value is treated as a one-off", () => {
  const { next } = completeTask({ id: 1, title: "x", status: "active", due: TODAY, tags: [], repeat: "constructor" }, TODAY);
  assert.equal(next, null);
});

// Review fix: unticking a completed recurring task undoes its spawned copy.
test("uncompleteTask: reactivates the task and removes its untouched next copy", () => {
  const done = { id: 1, title: "Stretch", status: "done", repeat: "daily", nextId: 2 };
  const tasks = [done, { id: 2, title: "Stretch", status: "active", repeat: "daily" }];
  const { revived, removeId } = uncompleteTask(done, tasks);
  assert.equal(revived.status, "active");
  assert.equal("nextId" in revived, false);
  assert.equal(removeId, 2);
});

test("uncompleteTask: keeps a next copy the user has already changed", () => {
  const done = { id: 1, status: "done", repeat: "daily", nextId: 2 };
  for (const status of ["done", "hold"]) {
    assert.equal(uncompleteTask(done, [done, { id: 2, status }]).removeId, null);
  }
});

test("uncompleteTask: a one-off task just becomes active", () => {
  const done = { id: 5, status: "done", repeat: "none" };
  assert.deepEqual(uncompleteTask(done, [done]), { revived: { id: 5, status: "active", repeat: "none" }, removeId: null });
});

test("stopRepeating: turns a recurring task into a one-off", () => {
  assert.equal(stopRepeating({ id: 3, repeat: "monthly" }).repeat, "none");
});

test("completeTask: a repeat with no due date anchors on today", () => {
  const { next } = completeTask({ id: 1, title: "x", status: "active", due: "", tags: [], repeat: "monthly" }, "2026-10-26");
  assert.equal(next.repeatDay, 26);
});

test("completeTask: a non-string repeat value (corrupt data) does not repeat", () => {
  assert.equal(completeTask({ id: 1, title: "x", status: "active", due: "", tags: [], repeat: ["daily"] }, TODAY).next, null);
});

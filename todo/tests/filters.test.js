// Characterisation tests: pin the status / tag filtering shipped in #13.
import { test } from "node:test";
import assert from "node:assert/strict";
import { countByStatus, allTags, filterTasks } from "../src/domain/filters.js";

const tasks = [
  { id: 1, title: "Buy groceries", status: "done", tags: ["home"] },
  { id: 2, title: "Expense report", status: "active", tags: ["work", "urgent"] },
  { id: 3, title: "Passport", status: "active", tags: ["admin"] },
  { id: 4, title: "Offsite", status: "hold", tags: ["work"] },
  { id: 5, title: "Leaking tap", status: "active", tags: ["home", "urgent"] },
];
const titles = (list) => list.map((t) => t.title);

test("countByStatus counts every status and the total", () => {
  assert.deepEqual(countByStatus(tasks), { all: 5, active: 3, hold: 1, done: 1 });
});

test("allTags returns each tag once, sorted", () => {
  assert.deepEqual(allTags(tasks), ["admin", "home", "urgent", "work"]);
});

test("filterTasks: status 'all' with no tag returns everything", () => {
  assert.equal(filterTasks(tasks, { status: "all", tag: "" }).length, 5);
});

test("filterTasks: by status", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "hold", tag: "" })), ["Offsite"]);
});

test("filterTasks: by tag", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "all", tag: "urgent" })), ["Expense report", "Leaking tap"]);
});

test("filterTasks: status and tag combine (on-hold #work is excluded from Active)", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "active", tag: "work" })), ["Expense report"]);
});

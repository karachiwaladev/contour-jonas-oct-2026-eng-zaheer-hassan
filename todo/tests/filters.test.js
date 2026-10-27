// Characterisation tests: pin the status / tag filtering shipped in #13.
import { test } from "node:test";
import assert from "node:assert/strict";
import { countByStatus, countByPriority, allTags, filterTasks } from "../src/domain/filters.js";

const tasks = [
  { id: 1, title: "Buy groceries", status: "done", tags: ["home"], priority: "low" },
  { id: 2, title: "Expense report", status: "active", tags: ["work", "urgent"], priority: "high" },
  { id: 3, title: "Passport", status: "active", tags: ["admin"], priority: "medium" },
  { id: 4, title: "Offsite", status: "hold", tags: ["work"], priority: "high" },
  { id: 5, title: "Leaking tap", status: "active", tags: ["home", "urgent"], priority: "medium" },
];
const titles = (list) => list.map((t) => t.title);

test("countByStatus counts every status and the total", () => {
  assert.deepEqual(countByStatus(tasks), { all: 5, active: 3, hold: 1, done: 1 });
});

test("allTags returns each tag once, sorted", () => {
  assert.deepEqual(allTags(tasks), ["admin", "home", "urgent", "work"]);
});

test("filterTasks: status 'all' with no tag returns everything", () => {
  assert.equal(filterTasks(tasks, { status: "all", tag: "", priority: "all", query: "" }).length, 5);
});

test("filterTasks: by status", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "hold", tag: "", priority: "all", query: "" })), ["Offsite"]);
});

test("filterTasks: by tag", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "all", tag: "urgent", priority: "all", query: "" })), ["Expense report", "Leaking tap"]);
});

test("filterTasks: status and tag combine (on-hold #work is excluded from Active)", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "active", tag: "work", priority: "all", query: "" })), ["Expense report"]);
});

test("countByPriority counts each priority and the total", () => {
  assert.deepEqual(countByPriority(tasks), { all: 5, high: 2, medium: 2, low: 1 });
});

test("countByPriority ignores a value that is not a priority", () => {
  assert.deepEqual(countByPriority([{ priority: "constructor" }, { priority: "all" }]), { all: 2, high: 0, medium: 0, low: 0 });
});

test("filterTasks: by priority", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "all", tag: "", priority: "high", query: "" })), ["Expense report", "Offsite"]);
});

test("filterTasks: priority combines with status and tag", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "active", tag: "urgent", priority: "medium", query: "" })), ["Leaking tap"]);
});

test("filterTasks: the search query narrows the list by title or tag", () => {
  assert.deepEqual(titles(filterTasks(tasks, { status: "all", tag: "", priority: "all", query: "urgent" })), ["Expense report", "Leaking tap"]);
  assert.deepEqual(titles(filterTasks(tasks, { status: "all", tag: "", priority: "all", query: "TAP" })), ["Leaking tap"]);
});

test("filterTasks: the query is ANDed with status, tag and priority", () => {
  const view = { status: "active", tag: "urgent", priority: "high", query: "report" };
  assert.deepEqual(titles(filterTasks(tasks, view)), ["Expense report"]);
  assert.deepEqual(titles(filterTasks(tasks, { ...view, query: "tap" })), []);
  assert.deepEqual(titles(filterTasks(tasks, { ...view, status: "hold" })), []);
  assert.deepEqual(titles(filterTasks(tasks, { ...view, tag: "work", query: "offsite" })), []);
  assert.deepEqual(titles(filterTasks(tasks, { ...view, priority: "medium" })), []);
});

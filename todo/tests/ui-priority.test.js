// ui/priorityBadge.js, ui/priorityFilter.js and the badge on a task row,
// against the real index.html markup in the fake DOM.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { fillPriorityBadge } from "../src/ui/priorityBadge.js";
import { renderPriorityFilter, bindPriorityFilter } from "../src/ui/priorityFilter.js";
import { renderTaskItem } from "../src/ui/taskItem.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let doc;
beforeEach(() => { doc = globalThis.document = createDocument(HTML); });

const badge = (priority) => {
  const el = doc.createElement("span");
  fillPriorityBadge(el, priority);
  return el;
};

test("fillPriorityBadge: each priority has its label, colour hook and tooltip", () => {
  for (const [priority, label] of [["high", "High"], ["medium", "Medium"], ["low", "Low"]]) {
    const el = badge(priority);
    assert.equal(el.textContent, label);
    assert.equal(el.dataset.priority, priority);
    assert.equal(el.title, `${label} priority`);
  }
});

test("fillPriorityBadge: a value that is not a priority shows as medium", () => {
  const el = badge("constructor");
  assert.equal(el.textContent, "Medium");
  assert.equal(el.dataset.priority, "medium");
});

test("renderTaskItem: the row shows the task's priority badge", () => {
  const template = doc.getElementById("task-template");
  const li = renderTaskItem(template, { id: 1, title: "x", status: "active", due: "", tags: [], repeat: "none", priority: "high" },
    { activeTag: "", today: "2026-10-26" });
  const el = li.querySelector(".task-priority");
  assert.equal(el.textContent, "High");
  assert.equal(el.dataset.priority, "high");
});

test("index.html: the add form offers each priority, Medium first chosen", () => {
  const select = doc.getElementById("task-priority");
  assert.deepEqual(select.querySelectorAll("option").map((o) => [o.value, o.textContent]),
    [["high", "High"], ["medium", "Medium"], ["low", "Low"]]);
  assert.notEqual(select.querySelectorAll("option")[1].getAttribute("selected"), null);
});

test("renderPriorityFilter: shows counts and presses the active priority", () => {
  const buttons = doc.querySelectorAll(".priority-filter");
  renderPriorityFilter(buttons, { all: 4, high: 1, medium: 2, low: 1 }, "medium");
  assert.deepEqual(buttons.map((b) => [b.dataset.priority, b.querySelector(".count").textContent, b.getAttribute("aria-pressed")]),
    [["all", "4", "false"], ["high", "1", "false"], ["medium", "2", "true"], ["low", "1", "false"]]);
});

test("bindPriorityFilter: a click selects that priority", async () => {
  const buttons = doc.querySelectorAll(".priority-filter");
  const picked = [];
  bindPriorityFilter(buttons, (p) => picked.push(p));
  await dispatch(buttons[1], "click");
  await dispatch(buttons[3], "click");
  assert.deepEqual(picked, ["high", "low"]);
});

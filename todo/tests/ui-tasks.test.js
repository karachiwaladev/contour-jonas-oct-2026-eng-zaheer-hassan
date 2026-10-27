// ui/chip.js, ui/taskItem.js and ui/taskList.js against the real index.html
// markup, loaded into the fake DOM.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { createChip } from "../src/ui/chip.js";
import { renderTaskItem, formatDue } from "../src/ui/taskItem.js";
import { renderTaskList, bindTaskList } from "../src/ui/taskList.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const TODAY = "2026-10-26";
let doc, template;
beforeEach(() => {
  doc = globalThis.document = createDocument(HTML);
  template = doc.getElementById("task-template");
});

const task = (fields) => ({ id: 1, title: "Pay rent", status: "active", due: "", tags: [], repeat: "none", ...fields });
const render = (fields, activeTag = "") => renderTaskItem(template, task(fields), { activeTag, today: TODAY });

test("createChip: a tag button that shows whether it is the active filter", () => {
  const chip = createChip("work", "work");
  assert.equal(chip.textContent, "#work");
  assert.equal(chip.type, "button"); // never a submit button, even inside a form
  assert.equal(chip.dataset.tag, "work");
  assert.equal(chip.getAttribute("aria-pressed"), "true");
  assert.equal(createChip("home", "work").getAttribute("aria-pressed"), "false");
});

test("formatDue: a readable local date", () => {
  assert.equal(formatDue("2026-10-26"), new Date(2026, 9, 26).toLocaleDateString(undefined,
    { month: "short", day: "numeric", year: "numeric" }));
});

test("renderTaskItem: an active one-off task with no due date or tags", () => {
  const li = render({});
  assert.equal(String(li.dataset.id), "1");
  assert.equal(li.dataset.status, "active");
  assert.equal(li.querySelector(".task-title").textContent, "Pay rent");
  assert.equal(li.querySelector(".task-done").checked, false);
  assert.equal(li.querySelector(".task-hold").getAttribute("aria-pressed"), "false");
  assert.equal(li.querySelector(".task-hold").title, "Put on hold");
  assert.equal(li.querySelector(".task-hold").hidden, false);
  assert.equal(li.querySelector(".task-delete").getAttribute("aria-label"), 'Delete "Pay rent"');
  assert.equal(li.querySelector(".task-due"), null);
  assert.equal(li.querySelector(".task-repeat-label"), null);
  assert.equal(li.querySelector(".task-repeat").hidden, true);
});

test("renderTaskItem: an on-hold task offers Resume", () => {
  const hold = render({ status: "hold" }).querySelector(".task-hold");
  assert.equal(hold.getAttribute("aria-pressed"), "true");
  assert.equal(hold.title, "Resume");
});

test("renderTaskItem: a done task is ticked and hides hold and stop-repeating", () => {
  const li = render({ status: "done", repeat: "weekly" });
  assert.equal(li.querySelector(".task-done").checked, true);
  assert.equal(li.querySelector(".task-hold").hidden, true);
  assert.equal(li.querySelector(".task-repeat").hidden, true);
  assert.equal(li.querySelector(".task-repeat-label").textContent, "⟳ Weekly");
});

test("renderTaskItem: each repeat has its label", () => {
  for (const [repeat, label] of [["daily", "⟳ Daily"], ["weekly", "⟳ Weekly"], ["monthly", "⟳ Monthly"]]) {
    assert.equal(render({ repeat }).querySelector(".task-repeat-label").textContent, label);
  }
});

test("renderTaskItem: an active repeating task can be stopped", () => {
  assert.equal(render({ repeat: "daily" }).querySelector(".task-repeat").hidden, false);
});

test("renderTaskItem: due dates are labelled overdue, soon, or plain", () => {
  const overdue = render({ due: "2026-10-20" });
  assert.match(overdue.querySelector(".task-due").textContent, /^Overdue · /);
  assert.equal(overdue.querySelector(".task-due").dataset.state, "overdue");
  assert.ok(overdue.classList.contains("due-overdue"));
  const soon = render({ due: TODAY });
  assert.ok(soon.classList.contains("due-soon"));
  assert.match(soon.querySelector(".task-due").textContent, /^Due soon · /);
  const later = render({ due: "2026-12-01" });
  assert.match(later.querySelector(".task-due").textContent, /^Due /);
  assert.equal(later.className, "task");
});

test("renderTaskItem: tags render as chips, marking the active one", () => {
  const chips = render({ tags: ["work", "home"] }, "home").querySelectorAll(".chip");
  assert.deepEqual(chips.map((c) => [c.textContent, c.getAttribute("aria-pressed")]),
    [["#work", "false"], ["#home", "true"]]);
});

const listEls = () => ({ list: doc.getElementById("task-list"), empty: doc.getElementById("empty"), template });

test("renderTaskList: shows the tasks and hides the empty message", () => {
  const els = listEls();
  renderTaskList(els, [task({ id: 1 }), task({ id: 2 })], 2, { activeTag: "", today: TODAY, query: "" });
  assert.equal(els.list.children.length, 2);
  assert.equal(els.empty.hidden, true);
});

test("renderTaskList: explains an empty list, or a filter with no matches", () => {
  const els = listEls();
  renderTaskList(els, [], 0, { activeTag: "", today: TODAY, query: "" });
  assert.equal(els.empty.hidden, false);
  assert.equal(els.empty.textContent, "No tasks yet. Add one above.");
  renderTaskList(els, [], 3, { activeTag: "", today: TODAY, query: "" });
  assert.equal(els.empty.textContent, "No tasks match this filter.");
});

test("renderTaskList: a search with no matches names the trimmed query, as text", () => {
  const els = listEls();
  renderTaskList(els, [], 3, { activeTag: "", today: TODAY, query: "  <b>rent</b> " });
  assert.equal(els.empty.hidden, false);
  assert.equal(els.empty.textContent, 'No tasks match "<b>rent</b>".');
  assert.equal(els.empty.children.length, 0);
  renderTaskList(els, [], 3, { activeTag: "", today: TODAY, query: "   " });
  assert.equal(els.empty.textContent, "No tasks match this filter.");
  renderTaskList(els, [], 0, { activeTag: "", today: TODAY, query: "rent" });
  assert.equal(els.empty.textContent, "No tasks yet. Add one above.");
});

test("bindTaskList: forwards each control to its handler with the task id", async () => {
  const els = listEls();
  renderTaskList(els, [task({ id: 7, repeat: "daily" })], 1, { activeTag: "", today: TODAY, query: "" });
  const calls = [];
  const log = (name) => (...args) => calls.push([name, ...args]);
  bindTaskList(els.list, { onDone: log("done"), onHold: log("hold"), onStopRepeat: log("stop"), onDelete: log("delete") });
  const li = els.list.firstElementChild;
  li.querySelector(".task-done").checked = true;
  await dispatch(li.querySelector(".task-done"), "change");
  await dispatch(li.querySelector(".task-title"), "change");
  for (const cls of [".task-hold", ".task-repeat", ".task-delete", ".task-title"]) await dispatch(li.querySelector(cls), "click");
  assert.deepEqual(calls, [["done", 7, true], ["hold", 7], ["stop", 7], ["delete", 7]]);
});

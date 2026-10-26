// ui/filterBar.js, ui/tagRow.js and ui/newTaskForm.js against the real
// index.html markup, loaded into the fake DOM.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { renderFilterBar, bindFilterBar } from "../src/ui/filterBar.js";
import { renderTagRow, bindTagClicks } from "../src/ui/tagRow.js";
import { bindNewTaskForm } from "../src/ui/newTaskForm.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let doc;
beforeEach(() => { doc = globalThis.document = createDocument(HTML); });

test("renderFilterBar: shows counts and presses the active status", () => {
  const buttons = doc.querySelectorAll(".filter");
  renderFilterBar(buttons, { all: 3, active: 2, hold: 0, done: 1 }, "active");
  assert.deepEqual(buttons.map((b) => [b.dataset.status, b.querySelector(".count").textContent, b.getAttribute("aria-pressed")]),
    [["all", "3", "false"], ["active", "2", "true"], ["hold", "0", "false"], ["done", "1", "false"]]);
});

test("bindFilterBar: a click selects that status", async () => {
  const buttons = doc.querySelectorAll(".filter");
  const picked = [];
  bindFilterBar(buttons, (s) => picked.push(s));
  await dispatch(buttons[2], "click");
  assert.deepEqual(picked, ["hold"]);
});

test("renderTagRow: hidden when no task has tags", () => {
  const row = doc.getElementById("tag-filter");
  renderTagRow(row, [], "");
  assert.equal(row.hidden, true);
  assert.equal(row.children.length, 0);
});

test("renderTagRow: one chip per tag, plus clear while a tag is active", () => {
  const row = doc.getElementById("tag-filter");
  renderTagRow(row, ["home", "work"], "");
  assert.equal(row.hidden, false);
  assert.deepEqual(row.children.map((c) => c.textContent), ["#home", "#work"]);
  renderTagRow(row, ["home", "work"], "work");
  assert.deepEqual(row.children.map((c) => c.textContent), ["#home", "#work", "✕ clear tag"]);
  assert.ok(row.children[2].classList.contains("chip-clear"));
});

test("bindTagClicks: a chip toggles its tag, clear clears, other clicks are ignored", async () => {
  const row = doc.getElementById("tag-filter");
  renderTagRow(row, ["work"], "work");
  const calls = [];
  bindTagClicks(doc, { onTag: (t) => calls.push(["tag", t]), onClear: () => calls.push(["clear"]) });
  const chipClick = await dispatch(row.children[0], "click");
  await dispatch(row.children[1], "click");
  const other = await dispatch(doc.getElementById("summary"), "click");
  assert.deepEqual(calls, [["tag", "work"], ["clear"]]);
  assert.equal(chipClick.defaultPrevented, true);
  assert.equal(other.defaultPrevented, false);
});

function fillForm(form, values) {
  for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
}

test("bindNewTaskForm: submits the trimmed title, due date, parsed tags and repeat, then resets", async () => {
  const form = doc.getElementById("new-task");
  const submitted = [];
  bindNewTaskForm(form, async (input) => submitted.push(input));
  fillForm(form, { title: "  Pay rent ", due: "2026-11-01", tags: "Home, bills, home", repeat: "monthly" });
  const event = await dispatch(form, "submit");
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(submitted, [{ title: "Pay rent", due: "2026-11-01", tags: ["home", "bills"], repeat: "monthly" }]);
  assert.equal(form.elements.namedItem("title").value, "");
  assert.equal(form.elements.namedItem("repeat").value, "none");
  assert.equal(doc.activeElement, form.elements.namedItem("title"));
});

test("bindNewTaskForm: a blank title submits nothing", async () => {
  const form = doc.getElementById("new-task");
  const submitted = [];
  bindNewTaskForm(form, async (input) => submitted.push(input));
  fillForm(form, { title: "   " });
  await dispatch(form, "submit");
  assert.deepEqual(submitted, []);
});

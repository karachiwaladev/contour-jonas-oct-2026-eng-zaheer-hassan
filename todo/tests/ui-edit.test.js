// ui/editForm.js: the inline edit form on a task row (#18), against the real
// index.html markup in the fake DOM.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { renderTaskList } from "../src/ui/taskList.js";
import { bindEditing } from "../src/ui/editForm.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const TASK = { id: 7, title: "Pay rent", status: "active", due: "2026-11-01", tags: ["home", "bills"], repeat: "none", priority: "high" };
let doc, list, calls;

beforeEach(() => {
  doc = globalThis.document = createDocument(HTML);
  list = doc.getElementById("task-list");
  const template = doc.getElementById("task-template");
  renderTaskList({ list, empty: doc.getElementById("empty"), template }, [TASK], 1, { activeTag: "", today: "2026-10-26" });
  calls = [];
  bindEditing(list, doc.getElementById("edit-template"), {
    getTask: (id) => { calls.push(["get", id]); return TASK; },
    onSave: async (id, input) => { calls.push(["save", id, input]); },
    onCancel: () => calls.push(["cancel"]),
  });
});

const row = () => list.firstElementChild;
const field = (name) => row().querySelector(".edit-form").elements.namedItem(name);
const openForm = () => dispatch(row().querySelector(".task-edit"), "click");

test("the Edit button is labelled with the task title", () => {
  assert.equal(row().querySelector(".task-edit").getAttribute("aria-label"), 'Edit "Pay rent"');
  assert.equal(row().querySelector(".task-edit").type, "button");
});

test("Edit replaces the row with a form filled from the task, title focused", async () => {
  await openForm();
  assert.deepEqual(calls, [["get", 7]]);
  assert.deepEqual(row().children.map((c) => c.className), ["edit-form"]);
  assert.deepEqual(["title", "priority", "due", "tags"].map((n) => field(n).value),
    ["Pay rent", "high", "2026-11-01", "home, bills"]);
  assert.equal(doc.activeElement, field("title"));
});

test("Save hands the form values to onSave and keeps the page from submitting", async () => {
  await openForm();
  field("title").value = "Pay the rent";
  field("priority").value = "low";
  field("due").value = "";
  field("tags").value = "Bills";
  const event = await dispatch(row().querySelector(".edit-form"), "submit");
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(calls.slice(1), [["save", 7, { title: "Pay the rent", priority: "low", due: "", tags: "Bills" }]]);
});

test("after a rejected save the form is still there with the title focused", async () => {
  await openForm();
  field("title").value = "  ";
  doc.activeElement = null;
  await dispatch(row().querySelector(".edit-form"), "submit");
  assert.equal(row().children[0].className, "edit-form");
  assert.equal(doc.activeElement, field("title"));
});

test("Cancel asks to close the form without saving", async () => {
  await openForm();
  await dispatch(row().querySelector(".edit-cancel"), "click");
  assert.deepEqual(calls, [["get", 7], ["cancel"]]);
});

test("other clicks and submits in the list are ignored", async () => {
  await dispatch(row().querySelector(".task-title"), "click");
  const event = await dispatch(row(), "submit");
  assert.deepEqual(calls, []);
  assert.equal(event.defaultPrevented, false);
});

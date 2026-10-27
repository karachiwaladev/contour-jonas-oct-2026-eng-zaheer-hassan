// End-to-end wiring (startApp.js, main.js) on the real index.html, with the fake
// DOM and fake IndexedDB standing in for the browser.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { createFakeIndexedDB } from "./helpers/fake-idb.js";
import { startApp } from "../src/startApp.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let doc;
beforeEach(() => {
  doc = globalThis.document = createDocument(HTML);
  globalThis.indexedDB = createFakeIndexedDB();
  Object.defineProperty(globalThis, "localStorage",
    { value: { getItem: () => null, setItem() {} }, configurable: true, writable: true });
});

const $ = (id) => doc.getElementById(id);
// UI listeners fire and forget, so wait until the fake database is idle.
const settle = () => globalThis.indexedDB.idle();
const act = async (el, type) => { await dispatch(el, type); await settle(); };
const titles = () => $("task-list").children.map((li) => li.querySelector(".task-title").textContent);

async function addTask(values) {
  const form = $("new-task");
  for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
  await dispatch(form, "submit");
}

test("startApp: an empty database shows the empty state", async () => {
  await startApp(doc);
  assert.equal($("empty").hidden, false);
  assert.equal($("empty").textContent, "No tasks yet. Add one above.");
  assert.equal($("summary").textContent, "");
  assert.equal($("summary").hidden, true);
});

test("startApp: adding a task renders it, its tag and the footer", async () => {
  await startApp(doc);
  await addTask({ title: "Pay rent", tags: "home" });
  assert.deepEqual(titles(), ["Pay rent"]);
  assert.equal($("summary").textContent, "1 open · 0 done");
  assert.equal($("summary").hidden, false);
  assert.equal($("tag-filter").hidden, false);
  assert.equal(doc.querySelector(".filter").querySelector(".count").textContent, "1");
});

test("startApp: list, filter and tag controls are wired to state", async () => {
  await startApp(doc);
  await addTask({ title: "A", tags: "work" });
  await addTask({ title: "B" });
  const row = (title) => $("task-list").children.find((li) => li.querySelector(".task-title").textContent === title);

  await act(row("B").querySelector(".task-hold"), "click");
  assert.equal($("summary").textContent, "2 open · 0 done");

  const done = row("A").querySelector(".task-done");
  done.checked = true;
  await act(done, "change");
  assert.equal($("summary").textContent, "1 open · 1 done");

  await act(doc.querySelectorAll(".filter").find((b) => b.dataset.status === "hold"), "click");
  assert.deepEqual(titles(), ["B"]);
  assert.equal($("summary").textContent, "1 open · 1 done", "the footer ignores the status filter");
  await act(doc.querySelectorAll(".filter")[0], "click");

  await act($("tag-filter").querySelector(".chip"), "click");
  assert.deepEqual(titles(), ["A"]);
  assert.equal($("summary").textContent, "1 open · 1 done", "the footer ignores the tag filter");
  await act($("tag-filter").querySelector(".chip-clear"), "click");
  assert.deepEqual(titles(), ["A", "B"]);

  const priority = (p) => doc.querySelectorAll(".priority-filter").find((b) => b.dataset.priority === p);
  await act(priority("high"), "click");
  assert.deepEqual(titles(), []);
  assert.equal($("summary").textContent, "1 open · 1 done", "the footer ignores the priority filter");
  await act(priority("all"), "click");

  await act(row("A").querySelector(".task-delete"), "click");
  assert.deepEqual(titles(), ["B"]);
});

test("startApp: a repeating task can be stopped from the list", async () => {
  await startApp(doc);
  await addTask({ title: "Stretch", repeat: "daily" });
  const stop = $("task-list").firstElementChild.querySelector(".task-repeat");
  assert.equal(stop.hidden, false);
  await act(stop, "click");
  assert.equal($("task-list").firstElementChild.querySelector(".task-repeat").hidden, true);
});

test("startApp: unticking a done task moves it back to open in the footer", async () => {
  await startApp(doc);
  await addTask({ title: "A" });
  const done = () => $("task-list").firstElementChild.querySelector(".task-done");
  done().checked = true;
  await act(done(), "change");
  assert.equal($("summary").textContent, "0 open · 1 done");
  done().checked = false;
  await act(done(), "change");
  assert.equal($("summary").textContent, "1 open · 0 done");
});

test("startApp: explains in the visible footer when the database cannot be opened", async () => {
  globalThis.indexedDB = createFakeIndexedDB({ failOpen: true });
  $("summary").hidden = true; // as it is after rendering an empty list
  await startApp(doc);
  assert.equal($("summary").textContent, "Could not open the local database: open failed");
  assert.equal($("summary").hidden, false);
});

test("main.js: starts the app on the page's document", async () => {
  await import("../src/main.js");
  await settle();
  assert.equal($("empty").textContent, "No tasks yet. Add one above.");
});

test("startApp: the list marks the active tag and highlights tasks due today", async () => {
  await startApp(doc);
  const today = new Date();
  const iso = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  await addTask({ title: "Ship it", tags: "work", due: iso });
  await act($("tag-filter").querySelector(".chip"), "click");
  const li = $("task-list").firstElementChild;
  assert.equal(li.querySelector(".chip").getAttribute("aria-pressed"), "true");
  assert.ok(li.classList.contains("due-soon"));
});

test("startApp: priority badges, counts and the priority filter are wired to state", async () => {
  await startApp(doc);
  await addTask({ title: "Fire", priority: "high" });
  await addTask({ title: "Chores" });
  const buttons = doc.querySelectorAll(".priority-filter");
  assert.deepEqual(buttons.map((b) => b.querySelector(".count").textContent), ["2", "1", "1", "0"]);
  assert.deepEqual($("task-list").children.map((li) => li.querySelector(".task-priority").textContent), ["High", "Medium"]);
  await act(buttons[1], "click");
  assert.deepEqual(titles(), ["Fire"]);
  assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
});

test("startApp: a task can be edited inline; blank titles are refused and Cancel closes", async () => {
  await startApp(doc);
  await addTask({ title: "Pay rent", tags: "home" });
  await addTask({ title: "Other" });
  const li = () => $("task-list").children[0];
  const form = () => li().querySelector(".edit-form");
  const set = (name, value) => { form().elements.namedItem(name).value = value; };

  await act(li().querySelector(".task-edit"), "click");
  assert.equal(form().elements.namedItem("title").value, "Pay rent");
  set("title", "   ");
  await act(form(), "submit");
  assert.ok(form(), "a blank title keeps the form open");

  await act(li().querySelector(".edit-cancel"), "click");
  assert.equal(form(), null);
  assert.deepEqual(titles(), ["Pay rent", "Other"]);

  await act(li().querySelector(".task-edit"), "click");
  set("title", "Pay the rent");
  set("priority", "high");
  set("tags", "bills");
  await act(form(), "submit");
  assert.deepEqual(titles(), ["Pay the rent", "Other"]);
  assert.equal(li().querySelector(".task-priority").textContent, "High");
  assert.deepEqual($("tag-filter").children.map((c) => c.textContent), ["#bills"]);

  const other = $("task-list").children[1];
  await act(other.querySelector(".task-edit"), "click");
  assert.equal(other.querySelector(".edit-form").elements.namedItem("title").value, "Other");
});

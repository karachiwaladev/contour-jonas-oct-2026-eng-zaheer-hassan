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
});

test("startApp: adding a task renders it, its tag and the summary", async () => {
  await startApp(doc);
  await addTask({ title: "Pay rent", tags: "home" });
  assert.deepEqual(titles(), ["Pay rent"]);
  assert.equal($("summary").textContent, "1 active · 0 on hold · 0 completed");
  assert.equal($("tag-filter").hidden, false);
  assert.equal(doc.querySelector(".filter").querySelector(".count").textContent, "1");
});

test("startApp: list, filter and tag controls are wired to state", async () => {
  await startApp(doc);
  await addTask({ title: "A", tags: "work" });
  await addTask({ title: "B" });
  const row = (title) => $("task-list").children.find((li) => li.querySelector(".task-title").textContent === title);

  await act(row("B").querySelector(".task-hold"), "click");
  assert.equal($("summary").textContent, "1 active · 1 on hold · 0 completed");

  const done = row("A").querySelector(".task-done");
  done.checked = true;
  await act(done, "change");
  assert.equal($("summary").textContent, "0 active · 1 on hold · 1 completed");

  await act(doc.querySelectorAll(".filter").find((b) => b.dataset.status === "hold"), "click");
  assert.deepEqual(titles(), ["B"]);
  await act(doc.querySelectorAll(".filter")[0], "click");

  await act($("tag-filter").querySelector(".chip"), "click");
  assert.deepEqual(titles(), ["A"]);
  await act($("tag-filter").querySelector(".chip-clear"), "click");
  assert.deepEqual(titles(), ["A", "B"]);

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

test("startApp: explains when the database cannot be opened", async () => {
  globalThis.indexedDB = createFakeIndexedDB({ failOpen: true });
  await startApp(doc);
  assert.equal($("summary").textContent, "Could not open the local database: open failed");
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

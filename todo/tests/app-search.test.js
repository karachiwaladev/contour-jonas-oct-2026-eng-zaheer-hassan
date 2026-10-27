// End-to-end search wiring (#21): startApp on the real index.html, with the fake
// DOM and fake IndexedDB standing in for the browser.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { createFakeIndexedDB } from "./helpers/fake-idb.js";
import { startApp } from "../src/startApp.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let doc, saved;
beforeEach(() => {
  doc = globalThis.document = createDocument(HTML);
  globalThis.indexedDB = createFakeIndexedDB();
  saved = [];
  Object.defineProperty(globalThis, "localStorage",
    { value: { getItem: () => null, setItem: (k) => saved.push(k) }, configurable: true, writable: true });
});

const $ = (id) => doc.getElementById(id);
const settle = () => globalThis.indexedDB.idle();
const titles = () => $("task-list").children.map((li) => li.querySelector(".task-title").textContent);

async function addTask(values) {
  const form = $("new-task");
  for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
  await dispatch(form, "submit");
}
async function type(text) {
  $("search").value = text;
  await dispatch($("search"), "input");
  await settle();
}

test("startApp: typing in the search box filters by title and tag, ANDed with the filters", async () => {
  await startApp(doc);
  await addTask({ title: "Pay rent", tags: "home" });
  await addTask({ title: "Fix tap", tags: "home", priority: "high" });
  await addTask({ title: "Report", tags: "work" });
  assert.equal($("search-clear").hidden, true);

  await type("HOME");
  assert.deepEqual(titles(), ["Pay rent", "Fix tap"]);
  assert.equal($("search-clear").hidden, false);

  await dispatch(doc.querySelectorAll(".priority-filter")[1], "click");
  await settle();
  assert.deepEqual(titles(), ["Fix tap"]);
  await dispatch(doc.querySelectorAll(".priority-filter")[0], "click");
  await settle();

  await type("home rent");
  assert.deepEqual(titles(), ["Pay rent"]);
  assert.equal($("search").value, "home rent");
  assert.deepEqual([...new Set(saved)], ["todo-app:priority-filter"], "the query is never saved");
});

test("startApp: no matches names the query; × and Esc clear the search", async () => {
  await startApp(doc);
  await addTask({ title: "Pay rent" });
  await addTask({ title: "Report" });

  await type("xyz");
  assert.deepEqual(titles(), []);
  assert.equal($("empty").hidden, false);
  assert.equal($("empty").textContent, 'No tasks match "xyz".');

  await dispatch($("search-clear"), "click");
  await settle();
  assert.deepEqual(titles(), ["Pay rent", "Report"]);
  assert.equal($("search").value, "");
  assert.equal($("search-clear").hidden, true);

  await type("rep");
  assert.deepEqual(titles(), ["Report"]);
  await dispatch($("search"), "keydown", { key: "Escape" });
  await settle();
  assert.deepEqual(titles(), ["Pay rent", "Report"]);
});

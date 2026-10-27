// ui/searchBox.js against the real index.html markup in the fake DOM (#21).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument, dispatch } from "./helpers/fake-dom.js";
import { bindSearchBox, renderSearchBox } from "../src/ui/searchBox.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let doc, input, clearBtn, queries;
beforeEach(() => {
  doc = globalThis.document = createDocument(HTML);
  input = doc.getElementById("search");
  clearBtn = doc.getElementById("search-clear");
  queries = [];
  bindSearchBox(input, clearBtn, (q) => queries.push(q));
});

test("index.html: a labelled search box with a clear button, hidden at first", () => {
  assert.equal(input.type, "search");
  assert.ok(doc.querySelectorAll("label").some((l) => l.getAttribute("for") === "search" && l.textContent.trim()));
  assert.equal(clearBtn.getAttribute("aria-label"), "Clear search");
  assert.equal(clearBtn.hidden, true);
});

test("bindSearchBox: typing passes the text on", async () => {
  input.value = "re";
  await dispatch(input, "input");
  input.value = "rent";
  await dispatch(input, "input");
  assert.deepEqual(queries, ["re", "rent"]);
});

test("bindSearchBox: the clear button empties the box, refocuses it and clears the query", async () => {
  input.value = "rent";
  await dispatch(clearBtn, "click");
  assert.equal(input.value, "");
  assert.equal(doc.activeElement, input);
  assert.deepEqual(queries, [""]);
});

test("bindSearchBox: Esc empties the box and clears the query; other keys don't", async () => {
  input.value = "rent";
  await dispatch(input, "keydown", { key: "a" });
  assert.equal(input.value, "rent");
  assert.deepEqual(queries, []);
  await dispatch(input, "keydown", { key: "Escape" });
  assert.equal(input.value, "");
  assert.deepEqual(queries, [""]);
});

test("renderSearchBox: shows the query and hides the clear button only when empty", () => {
  renderSearchBox(input, clearBtn, "rent");
  assert.equal(input.value, "rent");
  assert.equal(clearBtn.hidden, false);
  renderSearchBox(input, clearBtn, "");
  assert.equal(input.value, "");
  assert.equal(clearBtn.hidden, true);
});

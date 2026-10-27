// ui/footer.js against the real index.html markup, loaded into the fake DOM.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDocument } from "./helpers/fake-dom.js";
import { renderFooter } from "../src/ui/footer.js";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
let footer;
beforeEach(() => { footer = (globalThis.document = createDocument(HTML)).getElementById("summary"); });

test("index.html: the summary is a <footer>", () => {
  assert.equal(footer.tagName, "FOOTER");
});

test("renderFooter: shows the text and is visible", () => {
  footer.hidden = true;
  renderFooter(footer, "2 open · 1 done");
  assert.equal(footer.textContent, "2 open · 1 done");
  assert.equal(footer.hidden, false);
});

test("renderFooter: hidden with no text when the text is empty", () => {
  renderFooter(footer, "2 open · 1 done");
  renderFooter(footer, "");
  assert.equal(footer.textContent, "");
  assert.equal(footer.hidden, true);
});

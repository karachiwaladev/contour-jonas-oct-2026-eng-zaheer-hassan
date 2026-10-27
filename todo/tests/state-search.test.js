// State for #21: the search query lives in the view but is never saved.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/state.js";
import { memoryRepo } from "./helpers/memory-repo.js";

let writes;
beforeEach(() => {
  writes = [];
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: () => null, setItem: (k, v) => writes.push([k, v]) }, configurable: true, writable: true,
  });
});

test("a new state starts with an empty search query", () => {
  assert.equal(createState(memoryRepo()).get().view.query, "");
});

test("setQuery: updates the view and re-renders", async () => {
  const state = createState(memoryRepo());
  const seen = [];
  state.subscribe((s) => seen.push(s.view.query));
  await state.setQuery("rent");
  assert.equal(state.get().view.query, "rent");
  assert.deepEqual(seen, ["rent"]);
});

test("setQuery: is not remembered in localStorage", async () => {
  const state = createState(memoryRepo());
  await state.setQuery("rent");
  await state.setQuery("");
  assert.deepEqual(writes, []);
});

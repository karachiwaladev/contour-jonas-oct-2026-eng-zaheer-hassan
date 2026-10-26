// State for #18: the remembered priority filter and editing a task.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/state.js";
import { memoryRepo } from "./helpers/memory-repo.js";

function useLocalStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
}
const workingStorage = (saved = {}) => ({
  data: { ...saved },
  getItem(k) { return this.data[k] ?? null; },
  setItem(k, v) { this.data[k] = v; },
});
const blockedStorage = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};

// Spelled out, not imported from config.js: renaming a persisted key would
// silently forget every saved choice.
const PRIORITY_KEY = "todo-app:priority-filter";
const STATUS_KEY = "todo-app:filter";

beforeEach(() => useLocalStorage(workingStorage()));

test("priority filter: restores the saved choice", () => {
  useLocalStorage(workingStorage({ [PRIORITY_KEY]: "low" }));
  assert.equal(createState(memoryRepo()).get().view.priority, "low");
});

test("priority filter: defaults to all when nothing is saved", () => {
  assert.equal(createState(memoryRepo()).get().view.priority, "all");
});

test("priority filter: a saved value that is not a priority becomes all", () => {
  useLocalStorage(workingStorage({ [PRIORITY_KEY]: "constructor" }));
  assert.equal(createState(memoryRepo()).get().view.priority, "all");
});

test("priority filter: defaults to all when storage is blocked", () => {
  useLocalStorage(blockedStorage);
  assert.equal(createState(memoryRepo()).get().view.priority, "all");
});

test("setPriorityFilter: updates the view and remembers it, apart from the status filter", async () => {
  const storage = workingStorage({ [STATUS_KEY]: "done" });
  useLocalStorage(storage);
  const state = createState(memoryRepo());
  const seen = [];
  state.subscribe((s) => seen.push(s.view.priority));
  await state.setPriorityFilter("high");
  assert.equal(state.get().view.priority, "high");
  assert.equal(state.get().view.status, "done");
  assert.deepEqual(storage.data, { [STATUS_KEY]: "done", [PRIORITY_KEY]: "high" });
  assert.deepEqual(seen, ["high"]);
});

test("setPriorityFilter: still changes the view when storage is blocked", async () => {
  useLocalStorage(blockedStorage);
  const state = createState(memoryRepo());
  await state.setPriorityFilter("medium");
  assert.equal(state.get().view.priority, "medium");
});

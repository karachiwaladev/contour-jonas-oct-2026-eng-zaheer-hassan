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

async function oneTask() {
  const repo = memoryRepo();
  const state = createState(repo);
  await state.addTask({ title: "Pay rent", due: "", tags: ["home"], repeat: "daily", priority: "low" });
  const [id] = repo.rows.keys();
  const seen = [];
  state.subscribe((s) => seen.push(s.tasks.map((t) => t.title)));
  return { repo, state, id, seen };
}

test("editTask: saves the edited fields and re-renders", async () => {
  const { repo, state, id, seen } = await oneTask();
  await state.editTask(id, { title: " Rent ", priority: "high", due: "2026-12-01", tags: "Bills" });
  const saved = repo.rows.get(id);
  assert.deepEqual([saved.title, saved.priority, saved.due, saved.tags, saved.repeat, saved.status],
    ["Rent", "high", "2026-12-01", ["bills"], "daily", "active"]);
  assert.deepEqual(seen, [["Rent"]]);
});

test("editTask: a blank title saves nothing and does not re-render", async () => {
  const { repo, state, id, seen } = await oneTask();
  const before = JSON.stringify([...repo.rows]);
  await state.editTask(id, { title: "  ", priority: "high", due: "", tags: "" });
  assert.equal(JSON.stringify([...repo.rows]), before);
  assert.deepEqual(seen, []);
});

test("editTask: an unknown task id saves nothing", async () => {
  const { repo, state, seen } = await oneTask();
  const before = JSON.stringify([...repo.rows]);
  await state.editTask(999, { title: "x", priority: "high", due: "", tags: "" });
  assert.equal(JSON.stringify([...repo.rows]), before);
  assert.deepEqual(seen, []);
});

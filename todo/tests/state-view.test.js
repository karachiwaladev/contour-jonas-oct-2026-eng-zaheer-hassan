// State actions other than completion: view filters, hold, stop-repeat, delete,
// and the remembered status filter (localStorage, faked per test).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/state.js";
import { FILTER_KEY } from "../src/config.js";
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

beforeEach(() => useLocalStorage(workingStorage()));

async function withTasks(...tasks) {
  const repo = memoryRepo();
  const state = createState(repo);
  for (const t of tasks) await state.addTask({ due: "", tags: [], repeat: "none", ...t });
  return { repo, state, ids: state.get().tasks.map((t) => t.id) };
}

test("status filter: restores the saved choice", () => {
  useLocalStorage(workingStorage({ [FILTER_KEY]: "hold" }));
  assert.equal(createState(memoryRepo()).get().view.status, "hold");
});

test("status filter: defaults to all when nothing is saved", () => {
  assert.equal(createState(memoryRepo()).get().view.status, "all");
});

test("status filter: defaults to all when storage is blocked", () => {
  useLocalStorage(blockedStorage);
  assert.equal(createState(memoryRepo()).get().view.status, "all");
});

test("setStatusFilter: updates the view and remembers it", async () => {
  const storage = workingStorage();
  useLocalStorage(storage);
  const state = createState(memoryRepo());
  await state.setStatusFilter("done");
  assert.equal(state.get().view.status, "done");
  assert.equal(storage.data[FILTER_KEY], "done");
});

test("setStatusFilter: still changes the view when storage is blocked", async () => {
  useLocalStorage(blockedStorage);
  const state = createState(memoryRepo());
  await state.setStatusFilter("active");
  assert.equal(state.get().view.status, "active");
});

test("subscribe: listeners get the new state after each change", async () => {
  const { state } = await withTasks();
  const seen = [];
  state.subscribe((s) => seen.push(s.tasks.length));
  await state.addTask({ title: "a", due: "", tags: [], repeat: "none" });
  assert.deepEqual(seen, [1]);
});

test("toggleHold: puts a task on hold, then resumes it", async () => {
  const { repo, state, ids: [id] } = await withTasks({ title: "a" });
  await state.toggleHold(id);
  assert.equal(repo.rows.get(id).status, "hold");
  await state.toggleHold(id);
  assert.equal(repo.rows.get(id).status, "active");
});

test("stopRepeating: the task no longer repeats", async () => {
  const { repo, state, ids: [id] } = await withTasks({ title: "a", repeat: "daily" });
  await state.stopRepeating(id);
  assert.equal(repo.rows.get(id).repeat, "none");
});

test("an action on an unknown task id writes nothing", async () => {
  const { repo, state } = await withTasks({ title: "a" });
  const before = JSON.stringify([...repo.rows]);
  await state.toggleHold(999);
  await state.setDone(999, true);
  assert.equal(JSON.stringify([...repo.rows]), before);
});

test("setDone: asking for the status a task already has writes nothing", async () => {
  const { repo, state, ids: [id] } = await withTasks({ title: "a" });
  const writes = [];
  repo.complete = async () => writes.push("complete");
  repo.uncomplete = async () => writes.push("uncomplete");
  await state.setDone(id, false);
  assert.deepEqual(writes, []);
});

test("removeTask: deletes the task", async () => {
  const { repo, state, ids: [id] } = await withTasks({ title: "a" });
  await state.removeTask(id);
  assert.equal(repo.rows.size, 0);
});

test("toggleTag: selects a tag, and selecting it again clears it", async () => {
  const { state } = await withTasks({ title: "a", tags: ["work"] });
  await state.toggleTag("work");
  assert.equal(state.get().view.tag, "work");
  await state.toggleTag("work");
  assert.equal(state.get().view.tag, "");
});

test("clearTag: clears the tag filter", async () => {
  const { state } = await withTasks({ title: "a", tags: ["work"] });
  await state.toggleTag("work");
  await state.clearTag();
  assert.equal(state.get().view.tag, "");
});

test("a tag filter stays while some task still has the tag", async () => {
  const { state, ids } = await withTasks({ title: "a", tags: ["work"] }, { title: "b", tags: ["work"] });
  await state.toggleTag("work");
  await state.removeTask(ids[0]);
  assert.equal(state.get().view.tag, "work");
});

test("a tag filter is dropped when its last task is deleted", async () => {
  const { state, ids: [id] } = await withTasks({ title: "a", tags: ["work"] });
  await state.toggleTag("work");
  await state.removeTask(id);
  assert.equal(state.get().view.tag, "");
});

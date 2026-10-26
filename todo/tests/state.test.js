// State wiring for completing / uncompleting recurring tasks, against an
// in-memory repo with the same contract as storage/taskRepo.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/state.js";

function memoryRepo() {
  const rows = new Map();
  let nextId = 1;
  const tick = () => new Promise((r) => setTimeout(r, 5)); // simulate async IndexedDB
  return {
    rows,
    all: async () => { await tick(); return [...rows.values()].map((t) => ({ ...t })); },
    add: async (task) => { await tick(); const id = nextId++; rows.set(id, { ...task, id }); return id; },
    put: async (task) => { await tick(); rows.set(task.id, { ...task }); },
    remove: async (id) => { await tick(); rows.delete(id); },
    complete: async (completed, next) => {
      await tick();
      if (rows.get(completed.id)?.status === "done") return; // idempotent
      const saved = { ...completed };
      if (next) { const id = nextId++; rows.set(id, { ...next, id }); saved.nextId = id; }
      rows.set(saved.id, saved);
    },
    uncomplete: async (revived, removeId) => {
      await tick();
      rows.set(revived.id, { ...revived });
      if (removeId != null) rows.delete(removeId);
    },
  };
}

const active = (repo, title) => [...repo.rows.values()].filter((t) => t.title === title && t.status === "active");

async function setup() {
  const repo = memoryRepo();
  const state = createState(repo);
  await state.load();
  await state.addTask({ title: "Stretch", due: "", tags: [], repeat: "daily" });
  return { repo, state, id: state.get().tasks[0].id };
}

test("completing a recurring task leaves exactly one active occurrence", async () => {
  const { repo, state, id } = await setup();
  await state.setDone(id, true);
  assert.equal(active(repo, "Stretch").length, 1);
  assert.equal(repo.rows.get(id).status, "done");
});

test("unticking a completed recurring task removes its spawned copy", async () => {
  const { repo, state, id } = await setup();
  await state.setDone(id, true);
  await state.setDone(id, false);
  assert.equal(repo.rows.size, 1);
  assert.equal(repo.rows.get(id).status, "active");
});

test("tick / untick / tick never duplicates the series", async () => {
  const { repo, state, id } = await setup();
  await state.setDone(id, true);
  await state.setDone(id, false);
  await state.setDone(id, true);
  assert.equal(active(repo, "Stretch").length, 1);
});

test("a rapid double tick (overlapping calls) spawns only one copy", async () => {
  const { repo, state, id } = await setup();
  await Promise.all([state.setDone(id, true), state.setDone(id, true)]);
  assert.equal(active(repo, "Stretch").length, 1);
});

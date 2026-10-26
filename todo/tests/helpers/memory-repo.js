// In-memory repo with the same contract as src/storage/taskRepo.js, for state tests.
export function memoryRepo() {
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

// Task persistence. Everything read back is normalised to the current shape.
import { withStore, inTransaction } from "./db.js";
import { normalize } from "../domain/tasks.js";

// Marks a task done and (for a repeat) adds its next occurrence in ONE
// transaction, linking them via nextId. Idempotent: if the stored task is
// already done (e.g. a double click), nothing is written.
function complete(db, completed, next) {
  return inTransaction(db, (store) => {
    store.get(completed.id).onsuccess = (e) => {
      if (!e.target.result || e.target.result.status === "done") return;
      if (!next) return void store.put(completed);
      store.add(next).onsuccess = (added) => store.put({ ...completed, nextId: added.target.result });
    };
  });
}

// Reactivates a task and removes its untouched spawned occurrence, atomically.
function uncomplete(db, revived, removeId) {
  return inTransaction(db, (store) => {
    store.put(revived);
    if (removeId != null) store.delete(removeId);
  });
}

export function createTaskRepo(db) {
  return {
    all: async () => (await withStore(db, "readonly", (s) => s.getAll())).map(normalize),
    add: (task) => withStore(db, "readwrite", (s) => s.add({ ...task, createdAt: Date.now() })),
    put: (task) => withStore(db, "readwrite", (s) => s.put(task)),
    remove: (id) => withStore(db, "readwrite", (s) => s.delete(id)),
    complete: (completed, next) => complete(db, completed, next && { ...next, createdAt: Date.now() }),
    uncomplete: (revived, removeId) => uncomplete(db, revived, removeId),
  };
}

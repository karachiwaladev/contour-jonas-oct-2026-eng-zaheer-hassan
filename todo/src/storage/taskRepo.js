// Task persistence. Everything read back is normalised to the current shape.
import { withStore } from "./db.js";
import { normalize } from "../domain/tasks.js";

export function createTaskRepo(db) {
  return {
    all: async () => (await withStore(db, "readonly", (s) => s.getAll())).map(normalize),
    add: (task) => withStore(db, "readwrite", (s) => s.add({ ...task, createdAt: Date.now() })),
    put: (task) => withStore(db, "readwrite", (s) => s.put(task)),
    remove: (id) => withStore(db, "readwrite", (s) => s.delete(id)),
  };
}

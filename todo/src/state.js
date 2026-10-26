// App state: the task list and the current view. The only module that changes
// either; UI modules call these actions and re-render on change.
import { FILTER_KEY } from "./config.js";
import { allTags } from "./domain/filters.js";

function loadFilter() {
  try { return localStorage.getItem(FILTER_KEY) || "all"; } catch { return "all"; }
}

function saveFilter(status) {
  try { localStorage.setItem(FILTER_KEY, status); } catch { /* storage blocked: not remembered */ }
}

export function createState(repo) {
  const listeners = [];
  const state = { tasks: [], view: { status: loadFilter(), tag: "" } };

  const refresh = async () => {
    state.tasks = await repo.all();
    // Drop a tag filter whose last task was deleted, so the list never goes blank.
    if (state.view.tag && !allTags(state.tasks).includes(state.view.tag)) state.view.tag = "";
    listeners.forEach((fn) => fn(state));
  };
  const update = async (id, change) => {
    const task = state.tasks.find((t) => t.id === id);
    if (task) await repo.put({ ...task, ...change(task) });
    await refresh();
  };

  return {
    get: () => state,
    subscribe: (fn) => listeners.push(fn),
    load: refresh,
    addTask: async (task) => { await repo.add(task); await refresh(); },
    setDone: (id, done) => update(id, () => ({ status: done ? "done" : "active" })),
    toggleHold: (id) => update(id, (t) => ({ status: t.status === "hold" ? "active" : "hold" })),
    removeTask: async (id) => { await repo.remove(id); await refresh(); },
    setStatusFilter: async (status) => { state.view.status = status; saveFilter(status); await refresh(); },
    toggleTag: async (tag) => { state.view.tag = state.view.tag === tag ? "" : tag; await refresh(); },
    clearTag: async () => { state.view.tag = ""; await refresh(); },
  };
}

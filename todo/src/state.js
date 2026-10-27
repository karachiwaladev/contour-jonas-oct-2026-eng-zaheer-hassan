// App state: the task list and the current view. The only module that changes
// either; UI modules call these actions and re-render on change.
import { FILTER_KEY, PRIORITY_FILTER_KEY, PRIORITIES } from "./config.js";
import { allTags } from "./domain/filters.js";
import { today } from "./domain/dates.js";
import { prepareNewTask } from "./domain/tasks.js";
import { applyEdit } from "./domain/edit.js";
import { completeTask, uncompleteTask, stopRepeating } from "./domain/recurrence.js";

function loadFilter(key) {
  try { return localStorage.getItem(key) || "all"; } catch { return "all"; }
}

function saveFilter(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked: not remembered */ }
}

// Allow-listed: a stale or tampered saved value falls back to "all".
function loadPriorityFilter() {
  const saved = loadFilter(PRIORITY_FILTER_KEY);
  return PRIORITIES.includes(saved) ? saved : "all";
}

export function createState(repo) {
  const listeners = [];
  const pending = new Set(); // task ids with a completion write in flight
  const state = { tasks: [], view: { status: loadFilter(FILTER_KEY), tag: "", priority: loadPriorityFilter() } };

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
    addTask: async (input) => { await repo.add(prepareNewTask(input, today())); await refresh(); },
    setDone: async (id, done) => {
      // One write per task at a time: a second click while the first is still
      // saving is ignored (the re-render then shows the saved state).
      if (pending.has(id)) return;
      const task = state.tasks.find((t) => t.id === id);
      if (!task || (task.status === "done") === done) return;
      pending.add(id);
      try {
        if (done) {
          const { completed, next } = completeTask(task, today());
          await repo.complete(completed, next);
        } else {
          const { revived, removeId } = uncompleteTask(task, state.tasks);
          await repo.uncomplete(revived, removeId);
        }
      } finally {
        pending.delete(id);
      }
      await refresh();
    },
    stopRepeating: (id) => update(id, (t) => stopRepeating(t)),
    toggleHold: (id) => update(id, (t) => ({ status: t.status === "hold" ? "active" : "hold" })),
    // A blank title (or unknown id) writes nothing and skips the re-render, so
    // an open edit form stays open.
    editTask: async (id, input) => {
      const task = state.tasks.find((t) => t.id === id);
      const edited = task && applyEdit(task, input);
      if (!edited) return;
      await repo.put(edited);
      await refresh();
    },
    removeTask: async (id) => { await repo.remove(id); await refresh(); },
    setStatusFilter: async (status) => { state.view.status = status; saveFilter(FILTER_KEY, status); await refresh(); },
    setPriorityFilter: async (priority) => {
      state.view.priority = priority;
      saveFilter(PRIORITY_FILTER_KEY, priority);
      await refresh();
    },
    // Equivalent mutants: refresh() resets any tag no task has to "", so the
    // exact "no tag" value written here can't change what the user sees.
    // Stryker disable next-line StringLiteral: refresh() normalises an unused tag to ""
    toggleTag: async (tag) => { state.view.tag = state.view.tag === tag ? "" : tag; await refresh(); },
    // Stryker disable next-line StringLiteral: refresh() normalises an unused tag to ""
    clearTag: async () => { state.view.tag = ""; await refresh(); },
  };
}

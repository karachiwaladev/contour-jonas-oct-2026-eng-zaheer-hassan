// Todo app backed by IndexedDB (client-side DB, no server).
// Each task is stored as { id, title, status, due, tags, createdAt } where
// status is "active" | "hold" | "done", due is "YYYY-MM-DD" or "", tags is string[].

const DB_NAME = "todo-app";
const STORE = "tasks";
const FILTER_KEY = "todo-app:filter";
const DUE_SOON_DAYS = 1; // due today or tomorrow counts as "due soon"

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Runs fn(store) inside a transaction and resolves with the request's result.
function withStore(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

// Tasks saved before statuses/due dates/tags existed only have `done`.
function normalize(task) {
  return {
    ...task,
    status: task.status || (task.done ? "done" : "active"),
    due: task.due || "",
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

const store = {
  all: async (db) => (await withStore(db, "readonly", (s) => s.getAll())).map(normalize),
  add: (db, task) => withStore(db, "readwrite", (s) => s.add({ ...task, createdAt: Date.now() })),
  put: (db, task) => withStore(db, "readwrite", (s) => s.put(task)),
  remove: (db, id) => withStore(db, "readwrite", (s) => s.delete(id)),
};

function parseTags(text) {
  return [...new Set(text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

// Local "today" as YYYY-MM-DD, matching <input type="date"> values.
function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dueState(task) {
  if (!task.due || task.status === "done") return "";
  if (task.due < isoDay()) return "overdue";
  if (task.due <= isoDay(DUE_SOON_DAYS)) return "soon";
  return "later";
}

function formatDue(due) {
  return new Date(`${due}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const $ = (id) => document.getElementById(id);
const form = $("new-task");
const titleInput = $("task-title");
const dueInput = $("task-due");
const tagsInput = $("task-tags");
const list = $("task-list");
const empty = $("empty");
const summary = $("summary");
const tagFilter = $("tag-filter");
const template = $("task-template");
const filterButtons = [...document.querySelectorAll(".filter")];

// View state; the status filter is remembered across reloads.
const view = { status: "all", tag: "" };
try { view.status = localStorage.getItem(FILTER_KEY) || "all"; } catch {}

function renderTask(task) {
  const li = template.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
  li.dataset.status = task.status;
  li.querySelector(".task-title").textContent = task.title;
  li.querySelector(".task-done").checked = task.status === "done";

  const hold = li.querySelector(".task-hold");
  hold.setAttribute("aria-pressed", String(task.status === "hold"));
  hold.title = task.status === "hold" ? "Resume" : "Put on hold";
  hold.hidden = task.status === "done";
  li.querySelector(".task-delete").setAttribute("aria-label", `Delete "${task.title}"`);

  const due = li.querySelector(".task-due");
  const state = dueState(task);
  if (task.due) {
    const label = state === "overdue" ? "Overdue · " : state === "soon" ? "Due soon · " : "Due ";
    due.textContent = label + formatDue(task.due);
    due.dataset.state = state;
  } else {
    due.remove();
  }
  if (state === "overdue" || state === "soon") li.classList.add(`due-${state}`);

  const tags = li.querySelector(".task-tags");
  for (const tag of task.tags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.tag = tag;
    chip.textContent = `#${tag}`;
    chip.setAttribute("aria-pressed", String(view.tag === tag));
    tags.append(chip);
  }
  return li;
}

function render(tasks) {
  const counts = { all: tasks.length, active: 0, hold: 0, done: 0 };
  for (const t of tasks) counts[t.status]++;
  for (const btn of filterButtons) {
    const s = btn.dataset.status;
    btn.setAttribute("aria-pressed", String(view.status === s));
    btn.querySelector(".count").textContent = counts[s];
  }

  // Tag row: every tag in use; drop a selected tag that no longer exists.
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();
  if (view.tag && !allTags.includes(view.tag)) view.tag = "";
  tagFilter.hidden = allTags.length === 0;
  tagFilter.replaceChildren(
    ...allTags.map((tag) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.tag = tag;
      b.textContent = `#${tag}`;
      b.setAttribute("aria-pressed", String(view.tag === tag));
      return b;
    }),
    ...(view.tag ? [Object.assign(document.createElement("button"), {
      type: "button", className: "chip chip-clear", textContent: "✕ clear tag",
    })] : [])
  );

  const shown = tasks.filter((t) =>
    (view.status === "all" || t.status === view.status) && (!view.tag || t.tags.includes(view.tag)));
  list.replaceChildren(...shown.map(renderTask));

  empty.hidden = shown.length > 0;
  empty.textContent = tasks.length ? "No tasks match this filter." : "No tasks yet. Add one above.";
  summary.textContent = tasks.length ? `${counts.active} active · ${counts.hold} on hold · ${counts.done} completed` : "";
}

async function main() {
  const db = await openDb();
  const refresh = async () => render(await store.all(db));
  const findTask = async (el) => {
    const id = Number(el.closest(".task").dataset.id);
    return (await store.all(db)).find((t) => t.id === id);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    await store.add(db, { title, status: "active", due: dueInput.value, tags: parseTags(tagsInput.value) });
    form.reset();
    titleInput.focus();
    await refresh();
  });

  for (const btn of filterButtons) {
    btn.addEventListener("click", async () => {
      view.status = btn.dataset.status;
      try { localStorage.setItem(FILTER_KEY, view.status); } catch {}
      await refresh();
    });
  }

  // Clicking a tag (in the tag row or on a task) toggles the tag filter.
  document.addEventListener("click", async (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    e.preventDefault();
    view.tag = chip.classList.contains("chip-clear") || view.tag === chip.dataset.tag ? "" : chip.dataset.tag;
    await refresh();
  });

  // One listener on the list handles every task's checkbox, hold and delete.
  list.addEventListener("change", async (e) => {
    if (!e.target.matches(".task-done")) return;
    const task = await findTask(e.target);
    if (task) await store.put(db, { ...task, status: e.target.checked ? "done" : "active" });
    await refresh();
  });

  list.addEventListener("click", async (e) => {
    if (e.target.matches(".task-hold")) {
      const task = await findTask(e.target);
      if (task) await store.put(db, { ...task, status: task.status === "hold" ? "active" : "hold" });
      await refresh();
    } else if (e.target.matches(".task-delete")) {
      await store.remove(db, Number(e.target.closest(".task").dataset.id));
      await refresh();
    }
  });

  await refresh();
}

main().catch((err) => {
  summary.textContent = `Could not open the local database: ${err.message}`;
});

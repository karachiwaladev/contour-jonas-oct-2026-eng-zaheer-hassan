// Todo app backed by IndexedDB (client-side DB, no server).
// Each task is stored as { id, title, done, createdAt }.

const DB_NAME = "todo-app";
const STORE = "tasks";

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

const store = {
  all: (db) => withStore(db, "readonly", (s) => s.getAll()),
  add: (db, title) => withStore(db, "readwrite", (s) => s.add({ title, done: false, createdAt: Date.now() })),
  put: (db, task) => withStore(db, "readwrite", (s) => s.put(task)),
  remove: (db, id) => withStore(db, "readwrite", (s) => s.delete(id)),
};

const form = document.getElementById("new-task");
const input = document.getElementById("task-title");
const list = document.getElementById("task-list");
const empty = document.getElementById("empty");
const summary = document.getElementById("summary");
const template = document.getElementById("task-template");

function render(tasks) {
  list.replaceChildren(
    ...tasks.map((task) => {
      const li = template.content.firstElementChild.cloneNode(true);
      li.dataset.id = task.id;
      li.classList.toggle("done", task.done);
      li.querySelector(".task-title").textContent = task.title;
      li.querySelector(".task-done").checked = task.done;
      li.querySelector(".task-delete").setAttribute("aria-label", `Delete "${task.title}"`);
      return li;
    })
  );
  empty.hidden = tasks.length > 0;
  const left = tasks.filter((t) => !t.done).length;
  summary.textContent = tasks.length ? `${left} of ${tasks.length} left` : "";
}

async function main() {
  const db = await openDb();
  const refresh = async () => render(await store.all(db));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    await store.add(db, title);
    input.value = "";
    await refresh();
  });

  // One listener on the list handles every task's checkbox and delete button.
  list.addEventListener("change", async (e) => {
    if (!e.target.matches(".task-done")) return;
    const id = Number(e.target.closest(".task").dataset.id);
    const task = (await store.all(db)).find((t) => t.id === id);
    if (task) await store.put(db, { ...task, done: e.target.checked });
    await refresh();
  });

  list.addEventListener("click", async (e) => {
    if (!e.target.matches(".task-delete")) return;
    await store.remove(db, Number(e.target.closest(".task").dataset.id));
    await refresh();
  });

  await refresh();
}

main().catch((err) => {
  summary.textContent = `Could not open the local database: ${err.message}`;
});

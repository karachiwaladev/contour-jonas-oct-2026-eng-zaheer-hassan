// A small in-memory IndexedDB: enough of open / transaction / object store for
// src/storage. Requests succeed asynchronously and a transaction completes once
// no request is left pending. Set db.failNext = "error" | "abort" to make the
// next transaction fail instead of committing. await fake.idle() waits until
// no request, transaction or open is still in flight.
let busy = 0;
const later = (fn) => { busy++; setTimeout(() => { busy--; fn(); }, 0); };

function createStore({ keyPath, autoIncrement }) {
  return { keyPath, autoIncrement, rows: new Map(), nextKey: 1 };
}

const copy = (v) => (v === undefined ? undefined : structuredClone(v));

// Reads see a snapshot plus this transaction's own writes. Writes are logged
// and applied to the store only on commit, so a failed transaction writes nothing.
// Like the browser, misuse throws synchronously: an unknown store or mode, a
// write in a readonly transaction, a missing or null key.
const fail = (name, message) => { throw Object.assign(new Error(`${name}: ${message}`), { name }); };
const MODES = ["readonly", "readwrite"];

function createTransaction(db, name, mode = "readonly") {
  const store = db.stores.get(name) ?? fail("NotFoundError", `no object store "${name}"`);
  if (!MODES.includes(mode)) fail("TypeError", `invalid transaction mode "${mode}"`);
  const writable = () => mode === "readwrite" || fail("ReadOnlyError", "write in a readonly transaction");
  const validKey = (key) => key != null || fail("DataError", "invalid key");
  const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
  const view = new Map(store.rows);
  const writes = [];
  let pending = 0;
  let finished = false;
  let failure = null; // set by a request that fails, e.g. a duplicate add
  const finish = () => {
    finished = true;
    failure ||= db.failNext && { kind: db.failNext, error: new Error(`transaction ${db.failNext}`) };
    db.failNext = null;
    if (!failure) {
      for (const apply of writes) apply(store.rows);
      return tx.oncomplete?.();
    }
    tx.error = failure.error;
    tx[`on${failure.kind}`]?.();
  };
  const settle = () => later(() => { if (!finished && pending === 0) finish(); });
  const request = (compute) => {
    const req = { result: undefined, onsuccess: null };
    pending++;
    later(() => {
      if (!failure) {
        req.result = compute();
        if (!failure) req.onsuccess?.({ target: req });
      }
      pending--;
      settle();
    });
    return req;
  };
  const write = (key, value) => {
    if (value === undefined) view.delete(key); else view.set(key, value);
    writes.push((rows) => (value === undefined ? rows.delete(key) : rows.set(key, value)));
  };
  tx.objectStore = () => ({
    get: (key) => validKey(key) && request(() => copy(view.get(key))),
    getAll: () => request(() => [...view.values()].map(copy)),
    add: (value) => writable() && (value[store.keyPath] != null || store.autoIncrement || fail("DataError", "no key")) &&
      request(() => {
      const key = value[store.keyPath] ?? store.nextKey++;
      if (view.has(key)) {
        failure = { kind: "abort", error: new Error(`ConstraintError: key ${key} already exists`) };
        return undefined;
      }
      write(key, { ...copy(value), [store.keyPath]: key });
      return key;
    }),
    put: (value) => writable() && validKey(value[store.keyPath]) &&
      request(() => { write(value[store.keyPath], copy(value)); return value[store.keyPath]; }),
    delete: (key) => writable() && validKey(key) && request(() => { write(key, undefined); }),
  });
  settle(); // a transaction with no requests still completes
  return tx;
}

export function createFakeIndexedDB({ failOpen = false } = {}) {
  const databases = new Map();
  return {
    databases,
    async idle() {
      do await new Promise((r) => setTimeout(r, 0)); while (busy > 0);
    },
    open(name, version) {
      const req = { result: null, error: null };
      later(() => {
        if (failOpen) { req.error = new Error("open failed"); return req.onerror?.(); }
        let db = databases.get(name);
        if (!db) {
          db = { name, version, stores: new Map(), failNext: null };
          db.createObjectStore = (store, opts) => db.stores.set(store, createStore(opts));
          db.transaction = (store, mode) => createTransaction(db, store, mode);
          databases.set(name, db);
          req.result = db;
          req.onupgradeneeded?.();
        }
        req.result = db;
        req.onsuccess?.();
      });
      return req;
    },
  };
}

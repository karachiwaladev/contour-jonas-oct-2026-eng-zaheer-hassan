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

function createTransaction(db, name) {
  const store = db.stores.get(name);
  const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
  let pending = 0;
  const settle = () => later(() => {
    if (pending > 0) return;
    const failure = db.failNext;
    db.failNext = null;
    if (!failure) return tx.oncomplete?.();
    tx.error = new Error(`transaction ${failure}`);
    tx[`on${failure}`]?.();
  });
  const request = (compute) => {
    const req = { result: undefined, onsuccess: null };
    pending++;
    later(() => {
      req.result = compute();
      req.onsuccess?.({ target: req });
      pending--;
      settle();
    });
    return req;
  };
  const copy = (v) => (v === undefined ? undefined : structuredClone(v));
  tx.objectStore = () => ({
    get: (key) => request(() => copy(store.rows.get(key))),
    getAll: () => request(() => [...store.rows.values()].map(copy)),
    add: (value) => request(() => {
      const key = value[store.keyPath] ?? store.nextKey++;
      store.rows.set(key, { ...copy(value), [store.keyPath]: key });
      return key;
    }),
    put: (value) => request(() => { store.rows.set(value[store.keyPath], copy(value)); return value[store.keyPath]; }),
    delete: (key) => request(() => { store.rows.delete(key); }),
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
          db.transaction = (store) => createTransaction(db, store);
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

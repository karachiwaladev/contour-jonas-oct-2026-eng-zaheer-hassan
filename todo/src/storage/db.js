// IndexedDB connection and a promise wrapper around single-store transactions.
import { DB_NAME, DB_VERSION, STORE } from "../config.js";

export function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Runs fn(store) for several requests that must commit together (all or none);
// resolves with whatever fn's callbacks stored in `out` once the transaction commits.
export function inTransaction(db, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const out = {};
    fn(tx.objectStore(STORE), out);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Runs fn(store) in a transaction; resolves with the request's result on commit.
export function withStore(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

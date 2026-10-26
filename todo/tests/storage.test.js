// storage/db.js and storage/taskRepo.js against the in-memory fake IndexedDB.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createFakeIndexedDB } from "./helpers/fake-idb.js";
import { openDb, withStore, inTransaction } from "../src/storage/db.js";
import { createTaskRepo } from "../src/storage/taskRepo.js";
import { DB_NAME, STORE } from "../src/config.js";

let fake;
beforeEach(() => {
  fake = createFakeIndexedDB();
  globalThis.indexedDB = fake;
});

const task = (fields) => ({ title: "t", status: "active", due: "", tags: [], repeat: "none", ...fields });

test("openDb: creates the task store on first open", async () => {
  const db = await openDb();
  assert.ok(db.stores.has(STORE));
  assert.equal(fake.databases.get(DB_NAME), db);
});

test("openDb: reopening keeps the existing data", async () => {
  const repo = createTaskRepo(await openDb());
  await repo.add(task({ title: "kept" }));
  const again = createTaskRepo(await openDb());
  assert.deepEqual((await again.all()).map((t) => t.title), ["kept"]);
});

test("openDb: rejects when the database cannot be opened", async () => {
  globalThis.indexedDB = createFakeIndexedDB({ failOpen: true });
  await assert.rejects(openDb(), /open failed/);
});

test("withStore: resolves undefined when no request was made", async () => {
  assert.equal(await withStore(await openDb(), "readonly", () => undefined), undefined);
});

test("withStore: rejects when the transaction fails", async () => {
  const db = await openDb();
  db.failNext = "error";
  await assert.rejects(withStore(db, "readwrite", (s) => s.put(task({ id: 1 }))), /transaction error/);
});

test("inTransaction: rejects on error and on abort", async () => {
  const db = await openDb();
  for (const failure of ["error", "abort"]) {
    db.failNext = failure;
    await assert.rejects(inTransaction(db, (s) => s.put(task({ id: 1 }))), new RegExp(`transaction ${failure}`));
  }
});

test("repo: add, all, put and remove", async () => {
  const repo = createTaskRepo(await openDb());
  const id = await repo.add(task({ title: "a" }));
  const [saved] = await repo.all();
  assert.equal(saved.id, id);
  assert.equal(typeof saved.createdAt, "number");
  await repo.put({ ...saved, title: "b" });
  assert.equal((await repo.all())[0].title, "b");
  await repo.remove(id);
  assert.deepEqual(await repo.all(), []);
});

test("repo.all: normalises legacy rows", async () => {
  const db = await openDb();
  await withStore(db, "readwrite", (s) => s.add({ title: "old", done: true }));
  const [t] = await createTaskRepo(db).all();
  assert.equal(t.status, "done");
  assert.equal(t.repeat, "none");
});

test("repo.complete: a one-off task is just marked done", async () => {
  const repo = createTaskRepo(await openDb());
  const id = await repo.add(task());
  await repo.complete(task({ id, status: "done" }), null);
  const rows = await repo.all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "done");
});

test("repo.complete: a repeat adds its next occurrence and links it", async () => {
  const repo = createTaskRepo(await openDb());
  const id = await repo.add(task({ repeat: "daily" }));
  await repo.complete(task({ id, status: "done", repeat: "daily" }), task({ repeat: "daily", due: "2026-10-27" }));
  const rows = await repo.all();
  const next = rows.find((t) => t.id !== id);
  assert.equal(rows.find((t) => t.id === id).nextId, next.id);
  assert.equal(typeof next.createdAt, "number");
});

test("repo.complete: writes nothing if the task is already done or gone", async () => {
  const repo = createTaskRepo(await openDb());
  const id = await repo.add(task({ status: "done" }));
  await repo.complete(task({ id, status: "done", repeat: "daily" }), task({ repeat: "daily" }));
  await repo.complete(task({ id: 99, status: "done" }), null);
  assert.equal((await repo.all()).length, 1);
});

test("repo.uncomplete: revives the task, removing a spawned copy if given", async () => {
  const repo = createTaskRepo(await openDb());
  const id = await repo.add(task({ status: "done" }));
  const copy = await repo.add(task());
  await repo.uncomplete(task({ id }), copy);
  assert.deepEqual((await repo.all()).map((t) => [t.id, t.status]), [[id, "active"]]);
  await repo.uncomplete(task({ id, title: "again" }), null);
  assert.equal((await repo.all())[0].title, "again");
});

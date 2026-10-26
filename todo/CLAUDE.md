# todo: project context

Client-side todo app. IndexedDB storage, native ES modules, no build step, no dependencies.

## Module map

Layers only call downward: `ui → state → domain / storage`.

| Path | Role |
|------|------|
| `index.html` | Markup only; `#task-template` is the task row. Loads `src/main.js` as a module |
| `src/main.js` | Bootstrap loaded by `index.html`: calls `startApp(document)` |
| `src/startApp.js` | Wiring: storage, then state, then UI, for a given document. No business rules |
| `src/config.js` | Constants (DB name, filter key, due-soon window, statuses, repeats) |
| `src/state.js` | Task list and view (status + tag). The only place that changes them |
| `src/storage/db.js` | IndexedDB open and transaction helpers (`withStore`, multi-request `inTransaction`) |
| `src/storage/taskRepo.js` | Task create/read/update/delete, normalising on read. Atomic, idempotent `complete` and `uncomplete` |
| `src/domain/dates.js` | Local-day `YYYY-MM-DD` arithmetic, `dueState` |
| `src/domain/tasks.js` | `normalize` (legacy shapes), `parseTags`, `prepareNewTask` |
| `src/domain/filters.js` | Counts, tag catalogue, status/tag filtering |
| `src/domain/recurrence.js` | `nextDueDate` (monthly anchor day), `completeTask`, `uncompleteTask`, `stopRepeating` |
| `src/ui/*.js` | One module per component: task item, list, filter bar, tag row, form, chip |
| `styles/base.css` / `styles/components.css` | Tokens and elements / component styles |
| `tests/*.test.js` | `node --test` unit tests for every `src/` module |
| `tests/helpers/` | Test fakes: `fake-dom.js` (+ `parse-html.js`, loads the real `index.html`), `fake-idb.js`, `memory-repo.js` |
| `scripts/check-coverage.mjs` | `npm run test:coverage`: fails unless every `src/` file is 100% covered |

## Conventions

- **Dates** are local calendar days as `"YYYY-MM-DD"` strings. Never `new Date("YYYY-MM-DD")`, which parses as UTC; use `fromIso`/`toIso`. Pass `today` in, so logic is testable.
- **Task shape:** `{ id, title, status: "active"|"hold"|"done", due, tags[], repeat: "none"|"daily"|"weekly"|"monthly", repeatDay?, nextId?, createdAt }`.
  - `repeatDay` is the monthly anchor day. `nextId` links a completed recurring task to the occurrence it spawned, so unticking it can undo that.
  - New fields need a default in `normalize` so old data keeps working. Unknown `repeat` values normalise to `"none"`.
- **Completion** goes through `state.setDone`, which runs one write per task at a time, and `repo.complete` / `repo.uncomplete`, each a single transaction. Never complete a task with separate `put` + `add` calls.
- **New rules** go in `src/domain/`, test-first. `ui/` only renders and forwards events.
- **Coverage is 100% and must stay there.** Run `npm run test:coverage` before every PR. A new `src/` file needs tests that load it. Test UI against the fake DOM and storage against the fake IndexedDB, not by excluding files.
- **Size:** files under ~150 lines and functions under ~30. The god-object hook blocks files over 200 lines or 15 functions.

## Known limitations

- Stopping a repeat is one-way. Due date, tags and repeat are set only at creation; there's no editing yet.

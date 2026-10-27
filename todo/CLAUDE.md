# todo: project context

Client-side todo app. IndexedDB storage, native ES modules, no build step, no dependencies.

## Module map

Layers only call downward: `ui → state → domain / storage`.

| Path | Role |
|------|------|
| `index.html` | Markup only; `#task-template` is the task row, `#edit-template` its inline edit form. Loads `src/main.js` as a module |
| `src/main.js` | Bootstrap loaded by `index.html`: calls `startApp(document)` |
| `src/startApp.js` | Wiring: storage, then state, then UI, for a given document. No business rules |
| `src/config.js` | Constants (DB name, store, filter keys, due-soon window, repeats, priorities) |
| `src/state.js` | Task list and view (status + tag + priority filter, both filters remembered; search `query`, never saved). Actions incl. `editTask`, `setPriorityFilter`, `setQuery`. The only place that changes them |
| `src/storage/db.js` | IndexedDB open and transaction helpers (`withStore`, multi-request `inTransaction`) |
| `src/storage/taskRepo.js` | Task create/read/update/delete, normalising on read. Atomic, idempotent `complete` and `uncomplete` |
| `src/domain/dates.js` | Local-day `YYYY-MM-DD` arithmetic, `dueState` |
| `src/domain/tasks.js` | `normalize` (legacy shapes), `normalizePriority`, `parseTags`, `prepareNewTask` |
| `src/domain/edit.js` | `applyEdit`: title/priority/due/tags only; blank title returns `null`. A repeating task keeps its due if cleared; moving a monthly due re-anchors `repeatDay` |
| `src/domain/filters.js` | Counts by status and priority, tag catalogue, status/tag/priority/search filtering (all ANDed) |
| `src/domain/search.js` | `matchesQuery`: every space-separated word must appear, case-insensitively, in the title or a tag; blank matches all |
| `src/domain/recurrence.js` | `nextDueDate` (monthly anchor day), `completeTask`, `uncompleteTask`, `stopRepeating` |
| `src/ui/*.js` | One module per component: task item, list, filter bar, priority filter, priority badge, tag row, form, edit form, chip, search box (`searchBox.js`: × and Esc clear) |
| `styles/base.css` / `styles/components.css` | Tokens and elements / component styles |
| `tests/*.test.js` | `node --test` unit tests for every `src/` module |
| `tests/helpers/` | Test fakes: `fake-dom.js` (+ `parse-html.js`, loads the real `index.html`), `fake-idb.js`, `memory-repo.js` |
| `scripts/check-coverage.mjs` | `npm run test:coverage`: fails unless every `src/` file is 100% covered, with no blanket ignore comments |
| `stryker.config.mjs` | `npm run test:mutation`: Stryker mutation testing, break threshold 100% |
| `scripts/eval-policy.mjs` | Anti-cheat rules the gate enforces: only justified one-line Stryker exclusions, a locked Stryker config, and real npm scripts (tested in `tests/eval-policy.test.js`) |

## Conventions

- **Dates** are local calendar days as `"YYYY-MM-DD"` strings. Never `new Date("YYYY-MM-DD")`, which parses as UTC; use `fromIso`/`toIso`. Pass `today` in, so logic is testable.
- **Task shape:** `{ id, title, status: "active"|"hold"|"done", due, tags[], repeat: "none"|"daily"|"weekly"|"monthly", priority: "high"|"medium"|"low", repeatDay?, nextId?, createdAt }`.
  - `repeatDay` is the monthly anchor day. `nextId` links a completed recurring task to the occurrence it spawned, so unticking it can undo that.
  - New fields need a default in `normalize` so old data keeps working. Unknown `repeat` values normalise to `"none"`, unknown `priority` to `"medium"`.
- **Completion** goes through `state.setDone`, which runs one write per task at a time, and `repo.complete` / `repo.uncomplete`, each a single transaction. Never complete a task with separate `put` + `add` calls.
- **New rules** go in `src/domain/`, test-first. `ui/` only renders and forwards events.
- **Coverage and mutation score are 100% and must stay there.** Run `npm run eval` (coverage gate + Stryker) before every PR. A new `src/` file needs tests that load it. Test UI against the fake DOM and storage against the fake IndexedDB, not by excluding files.
- **A surviving mutant means a missing assertion:** add the test. Only a truly equivalent mutant (one that can't change observable behaviour) gets `// Stryker disable next-line <Mutator>: <reason>`. Persisted names (DB, store, filter key) are tested as literal strings, because renaming them loses users' data.
- **Size:** files under ~150 lines and functions under ~30. The god-object hook blocks files over 200 lines or 15 functions.

## Known limitations

- Stopping a repeat is one-way. Title, priority, due date and tags are editable; repeat is set only at creation. No sorting by priority.

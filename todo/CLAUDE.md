# todo: project context

Client-side todo app. IndexedDB storage, native ES modules, no build step, no dependencies.

## Module map

Layers only call downward: `ui → state → domain / storage`.

| Path | Role |
|------|------|
| `index.html` | Markup only; `#task-template` is the task row. Loads `src/main.js` as a module |
| `src/main.js` | Wiring: storage, then state, then UI. No business rules |
| `src/config.js` | Constants (DB name, filter key, due-soon window, statuses, repeats) |
| `src/state.js` | Task list and view (status + tag). The only place that changes them |
| `src/storage/db.js` | IndexedDB open and transaction helper |
| `src/storage/taskRepo.js` | Task create/read/update/delete; normalises on read |
| `src/domain/dates.js` | Local-day `YYYY-MM-DD` arithmetic, `dueState` |
| `src/domain/tasks.js` | `normalize` (legacy shapes), `parseTags`, `prepareNewTask` |
| `src/domain/filters.js` | Counts, tag catalogue, status/tag filtering |
| `src/domain/recurrence.js` | `nextDueDate`, `completeTask`, `stopRepeating` |
| `src/ui/*.js` | One module per component: task item, list, filter bar, tag row, form, chip |
| `styles/base.css` / `styles/components.css` | Tokens and elements / component styles |
| `tests/*.test.js` | `node --test` unit tests for `src/domain/` |

## Conventions

- **Dates** are local calendar days as `"YYYY-MM-DD"` strings. Never `new Date("YYYY-MM-DD")`, which parses as UTC; use `fromIso`/`toIso`. Pass `today` in, so logic is testable.
- **Task shape:** `{ id, title, status: "active"|"hold"|"done", due, tags[], repeat: "none"|"daily"|"weekly"|"monthly", createdAt }`. New fields need a default in `normalize` so old data keeps working.
- **New rules** go in `src/domain/`, test-first. `ui/` only renders and forwards events.
- **Size:** files under ~150 lines and functions under ~30. The god-object hook blocks files over 200 lines or 15 functions.

## Known limitations

- Monthly repeats continue from a clamped day (Jan 31 → Feb 28 → Mar 28).
- Due date, tags and repeat are set only at creation; there's no editing yet.

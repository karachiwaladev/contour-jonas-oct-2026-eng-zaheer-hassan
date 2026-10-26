# Todo

A small todo app that stores tasks in the browser's **IndexedDB**: no server and no build step.

- **Add** a task with an optional **due date**, comma-separated **tags** (`work, urgent`) a **priority** (High / Medium / Low, default Medium) and a **repeat** (None / Daily / Weekly / Monthly).
- **Statuses:** tick a task to complete it, or press ⏸ to put it **on hold** (press again to resume). ✕ deletes it.
- **Edit** (✎) a task inline: change its title, priority, due date or tags, then Save or Cancel. A blank title isn't saved. Repeat can't be edited.
- **Filter** by **All / Active / On hold / Completed**, and by **priority** (Any / High / Medium / Low). Both choices are remembered across reloads.
- **Priority** shows as a coloured badge: High red, Medium amber, Low grey.
- **Tags** show as chips. Click one to filter by it, combined with the status filter. "✕ clear tag" resets it.
- **Due dates:** tasks due **today or tomorrow** are amber ("Due soon"), and **past due** tasks are red ("Overdue").
- **Recurring tasks** show a **⟳ Daily / Weekly / Monthly** label:
  - **Completing one** keeps it in Completed and adds the next occurrence: the next day, the same weekday next week, or the same day next month. A day that doesn't exist falls back to the month's last day, and the series returns to its original day afterwards (Jan 31 → Feb 28 → Mar 31).
  - **Unticking by mistake** undoes it: the task becomes active again, and the occurrence it created is removed if you haven't touched it yet.
  - **Completing late** skips straight to the first date after today.
  - **No due date** means the first occurrence is due today.
  - **⟳ on the task** stops it repeating. This is one-way: to repeat it again, add a new task.

## Run

ES modules must be served over HTTP; opening `index.html` from disk won't work. From the repo root:

```
npx serve todo
```

The server must send `.js` as `text/javascript`. `npx serve` does. Python's `http.server` on Windows can send `text/plain`, which browsers refuse for modules.

## Test

```
cd todo && npm test                 # = node --test
cd todo && npm install              # dev-only: Stryker, for mutation testing
cd todo && npm run test:coverage    # tests + 100% coverage gate
cd todo && npm run test:mutation    # Stryker mutation testing, must kill 100% of mutants
cd todo && npm run eval             # both: the full quality gate
```

Every file in `src/` has 100% line, branch and function coverage, and `npm run test:coverage` fails if that slips. It also fails for a `src/` file that no test loads. UI and wiring tests run against the real `index.html` in a small fake DOM (`tests/helpers/fake-dom.js`), and storage runs against a fake IndexedDB (`tests/helpers/fake-idb.js`). Both fakes throw where a real browser would.

**Mutation testing** checks that the tests actually test something. Stryker makes ~500 small edits to `src/`, one at a time (for example flipping `===` to `!==`, emptying a string, or deleting a call), and reruns the tests. Every edit must make a test fail. A mutant that survives means an assertion is missing, so 100% coverage alone isn't enough. A mutant that truly can't change behaviour is excluded in the source with `// Stryker disable next-line <Mutator>: <reason>`. Other forms are rejected by the gate. The HTML report is written to `reports/mutation/index.html`.

The app has no runtime dependencies and no build step. Stryker is a dev dependency used only for testing. See `CLAUDE.md` for the module map.

> `app.js` and `styles.css` are the pre-#15 single-file version, kept for reference. They're no longer loaded.

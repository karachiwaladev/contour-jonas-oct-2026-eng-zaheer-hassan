# Todo

A small todo app that stores tasks in the browser's **IndexedDB**, so there's no server or build step.

- **Add** a task with an optional **due date** and comma-separated **tags** (`work, urgent`).
- **Statuses:** tick a task to complete it, or press ⏸ to put it **on hold** (press again to resume). ✕ deletes it.
- **Filter** by **All / Active / On hold / Completed**. The choice is remembered across reloads.
- **Tags** show as chips. Click one (on a task or in the tag row) to filter by it, combined with the status filter. Use "✕ clear tag" to reset.
- **Due dates:** tasks due **today or tomorrow** are highlighted amber ("Due soon"), and tasks **past due** are red ("Overdue"). Completed tasks aren't highlighted.
- Tasks persist across reloads. They're stored per browser profile.

## Run

Open `index.html` in a browser, or serve the folder:

```
npx serve todo
```

Files: `index.html` (markup), `styles.css` (light/dark styles), `app.js` (IndexedDB storage + UI). Screenshots from verification are in `docs/screenshots/`.

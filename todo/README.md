# Todo

A small todo app that stores tasks in the browser's **IndexedDB**, so there's no server or build step.

- Add a task, tick it off when done, delete it with ✕.
- Tasks persist across reloads. They're stored per browser profile.

## Run

Open `index.html` in a browser, or serve the folder:

```
npx serve todo
```

Files: `index.html` (markup), `styles.css` (light/dark styles), `app.js` (IndexedDB storage + UI).

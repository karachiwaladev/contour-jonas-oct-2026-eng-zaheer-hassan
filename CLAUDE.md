# Software Factory

This repo is a **software factory**. Work arrives as GitHub issues (`Ticket #N`), and an agent loop picks them up and delivers them. We build and improve the loop. We don't hand-build features.

Hard limit: **this file stays under 100 lines.** It's the index, not the manual. When a section grows, move the detail into a file the index points to.

## How the factory runs

- **Intake:** GitHub issues in this repo.
- **Loop:** the `factory-loop` skill (`.claude/skills/factory-loop/SKILL.md`). Run it once with `/factory-loop`, or keep it running with `/loop 5m /factory-loop`.
- **Output:** answers as issue comments, and changes as commits/PRs that reference the issue (`Closes #N`).
- Only what's on GitHub counts: files, issues, comments, commits.

## Progressive disclosure

Agents load context in layers, and only as deep as the task needs:

1. **This file:** always loaded. Purpose, rules and the index below. Keep it short.
2. **Project `CLAUDE.md`:** each project folder has its own, loaded only when work touches that project. It covers stack, commands, conventions and gotchas.
3. **Deep docs:** `docs/` inside a project (design notes, references). Read on demand when the project `CLAUDE.md` points to it.

Rules that follow from this:
- Put information at the **lowest layer that needs it**. Project detail never goes in this file.
- Every pointer says **when** to follow it ("read X before touching the API"), so agents can skip what they don't need.
- If a project `CLAUDE.md` passes ~100 lines, split it into `docs/` the same way.

## Project layout

Each project gets its own top-level folder under `projects/`:

```
projects/
  <project-name>/
    CLAUDE.md      # layer 2: project context, under 100 lines
    docs/          # layer 3: optional, on-demand detail
    ...source...
```

- Folder names are `kebab-case`.
- A new project isn't done until it has a `CLAUDE.md` **and** a row in the index below.
- Projects don't reach into each other's folders. Shared code gets its own project.

## Index

Keep this table in sync whenever a project or factory tool is added, renamed or removed.

### Factory tooling

| Name | Path | What it is |
|------|------|------------|
| factory-loop | `.claude/skills/factory-loop/` | Works the issue queue: 👀, answer/clarify, close |

### Projects

| Project | Path | Status | Summary |
|---------|------|--------|---------|
| todo | `todo/` | Active | Browser todo app (IndexedDB, native ES modules): due dates, tags, status filters, recurring tasks. Read `todo/CLAUDE.md` before touching it |

## Ground rules

- Training repo only: no Jonas or Contour code, and no real keys or secrets.
- Reference the ticket in every commit/PR (`Closes #N` / `Refs #N`).
- Check facts before posting answers, and cite only sources you actually opened.

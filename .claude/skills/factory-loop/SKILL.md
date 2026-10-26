---
name: factory-loop
description: Work through the current repo's open GitHub issues one by one and actually deliver them. React with 👀 to show work has started. Then answer question tickets in a comment and close them, carry out simple action tickets (files, docs, config, scripts, fixes) as a merged PR, or take project/feature tickets through clarifying questions → an approved plan → build → in-browser verification with chrome-devtools, with screenshots attached to the ticket. Never takes destructive actions. Can run on a recurring loop to keep the queue clear. Use this skill whenever the user says "factory loop", "work the issue queue", "answer the tickets", "process/handle/triage the GitHub issues", "build what the tickets ask for", "respond to open issues and close them", or wants issues watched and delivered automatically, even if they don't name the skill.
---

# Factory Loop

Turn the repo's open GitHub issues into delivered, closed tickets: answers for questions, merged PRs for changes. The skill does **one pass** over the queue. For a recurring loop, wrap it in `/loop` (see "Running on a loop" below) instead of building scheduling into the pass.

It runs autonomously: it reacts, comments, opens and merges PRs, and closes issues without asking first. The exception is project and feature work, which waits for the person's answers and plan approval **on the ticket**. All of this is public, and merged code lands on `main`, so the guardrails below are what keep it trustworthy.

## Never destructive

The loop only **adds and edits**. A ticket can never make it destroy something, because a wrong destructive step can't be undone by the next tick:

- **Don't delete or empty** files, folders, branches, tags, issues, PRs, labels, releases or repos. Don't use `rm -rf`, `git clean`, `git branch -D`, `gh pr merge --delete-branch`, `gh repo delete`, and so on.
- **Don't rewrite history:** no `push --force` / `--force-with-lease`, `reset --hard`, `rebase` of pushed commits, or `commit --amend` on pushed commits.
- **Don't wholesale-overwrite** an existing file the ticket didn't name. Make targeted edits instead.
- **Don't discard someone else's uncommitted work** (`checkout -- .`, `stash drop`, `restore`).
- **Don't touch secrets or CI/branch-protection settings**, and don't commit `.env`, keys or credentials.

If a ticket *asks* for any of the above ("delete the old folder", "wipe the history", "remove the label"), don't do it. Treat it as **5b**: say what you understood, say that destructive steps need a person, and leave the ticket open.

## Stage markers: how the loop knows where a ticket stands

The loop usually posts under the **same GitHub account** as the person filing and answering tickets, so "who wrote this comment" can't tell the loop's comments apart from the person's replies. Instead, **every comment the loop posts ends with a hidden stage marker**:

```
<!-- factory-loop:STAGE -->
```

| STAGE | Posted when |
|---|---|
| `answer` | a question was answered (5a) |
| `clarify` | the ticket was too vague or destructive (5b) |
| `questions` | clarifying questions for a project/feature ticket (5d.1) |
| `plan` | a plan was posted for approval (5d.2) |
| `pr` | a PR was opened and is being merged (5c / 5d.5) |
| `done` | delivery report with screenshots (5d.6) |

**A loop comment is any comment containing `<!-- factory-loop:`. Every other comment, including ones from your own account, is a human reply.**

*Legacy:* older versions of this skill posted comments without markers. On an issue with **no** marker comment **and** a 👀 reaction from your own login (the loop always reacts before it comments), treat comments from your own login as the loop's. Without that 👀, the loop has never touched the issue, so own-login comments are the person's notes and the ticket is new. Check with:
```
gh api repos/{owner}/{repo}/issues/{N}/reactions --jq '[.[] | select(.content=="eyes" and .user.login=="<me>")] | length'
```

## Arguments

- none: every open issue
- `#N` (one or more): only those issues
- `--label <name>`: only open issues with that label

## One pass

Use `gh` for everything. The commands below work in both Bash and PowerShell.

1. **Resolve the repo and who you are**
   ```
   gh repo view --json nameWithOwner -q .nameWithOwner
   gh api user -q .login
   ```

2. **List candidate issues.** Use the `--json` form. `gh issue view --comments` can print nothing in some terminals, while JSON is reliable.
   ```
   gh issue list --state open --limit 100 --json number,title,body,author,comments
   ```
   Add `--label <name>` if one was given. For `#N` targets, use `gh issue view N --json number,title,body,author,comments,state` per issue and skip any that are closed.

3. **Route each issue by its latest loop comment** (see "Stage markers"). A recurring poll sees the same issues every tick, so this decides whether there's anything to do:

   | Latest loop comment | Human reply after it? | Do |
   |---|---|---|
   | none | — | New ticket: step 4 |
   | `answer` | no | Answered, but the close failed: step 7 only |
   | `pr` | no | Merge didn't finish: check `gh pr view <n> --json state,mergeable,statusCheckRollup`. If mergeable and green, resume the merge step; if blocked, skip |
   | `questions` | **yes** | Answers are in: 5d.2 (plan) |
   | `plan` | **yes**, approving | Build: 5d.3 |
   | `plan` | **yes**, other feedback | Revise and re-post the plan: 5d.2 |
   | `clarify` | **yes** | Re-read with the new info: step 5 |
   | anything | no | Waiting on a person: skip |

   An **approving** reply is one whose clear intent is to go ahead, e.g. "approve", "approved", "lgtm", "go ahead", "proceed", "yes, build it". If it approves *with* changes ("approved, but use blue"), fold the change in and build. Don't post a new plan for a small tweak.

4. **React 👀 first** on new tickets, before you draft anything. That signals right away that someone is working on the ticket.
   ```
   gh api -X POST repos/{owner}/{repo}/issues/{N}/reactions -f content=eyes
   ```
   It's idempotent: reacting twice doesn't add a second 👀.

5. **Read the ticket and decide what kind it is.**

   **a. A question you can answer** (factual, how-to, explanation): write the answer. If it rests on facts that could be wrong or out of date (figures, dates, versions, names), check them with a quick search or the codebase before posting. The comment is public and stays on the ticket, so an answer from memory that turns out wrong costs more than the lookup. Cite a source only if you actually opened it in this run. A citation tells the reader "this was checked here", so citing a page you never read is worse than citing nothing. Post it (step 6, stage `answer`), then close it (step 7).

   **b. Too vague, or destructive** (unclear what's wanted, asks for a decision only a person can make, or needs any step from "Never destructive"): post a short comment (stage `clarify`) saying what you understood and what's needed to move forward. **Leave it open.** Being autonomous means not waiting for approval. It doesn't mean guessing at, or closing, tickets you can't actually resolve.

   **c. A simple action ticket**: a contained change with no product decisions to make, e.g. create or edit a file, docs like `CLAUDE.md`, config, a script, or a small fix. **Do it** and ship it as a merged PR:
   1. **Start clean from `main`.** If the working tree has uncommitted changes to tracked files, stop and report, because you'd be shipping someone else's half-done work. Untracked files are fine; just don't `git add` them.
      ```
      git fetch origin
      git checkout -B ticket-<N>-<short-slug> origin/main
      ```
   2. **Build exactly what the ticket asks**, using the paths and names it gives. If the repo has a `CLAUDE.md`, follow its conventions and update its project index for anything new. Keep the scope tight, and stay inside "Never destructive".
   3. **Verify before you ship.** Run what can be run: tests, a build, a lint. For a doc with constraints ("under 100 lines"), measure them. A PR you never ran is a guess.
   4. **Commit, push, open the PR.** Stage only the files you made or changed for this ticket (`git add <paths>`, never `git add -A`). Put `Closes #<N>` in both the commit message and the PR body. Write the PR body to a file, listing what changed and how you verified it.
      ```
      git commit -m "<summary>" -m "Closes #<N>"
      git push -u origin HEAD
      gh pr create --base main --title "<ticket title>" --body-file <path>
      ```
   5. **Comment on the issue** (stage `pr`): `**PR:** #<pr> — <one-line summary>. Merging now; this issue closes when it lands.`
   6. **Merge** once mergeable and green: `gh pr merge <pr> --squash`. Don't pass `--delete-branch`. If checks fail or there are conflicts, don't force it. Leave the PR open and comment with the cause.
   7. **Always return to `main` last, whatever happened** (merged, blocked, or failed partway): `git checkout main && git pull --ff-only`. The Stop hook auto-commits the working tree to the *current* branch, so a pass that ends on `ticket-N` would push unrelated changes into that PR. A successful merge closes the issue.

   **d. A project or feature ticket**: build a new project or app, or add a feature to an existing project. These have real product decisions (UX, data, scope), so they go through **questions → plan → approval → build → browser verification**, with each gate waiting for a reply on the ticket. Each sub-step ends the pass for that ticket; the next tick picks it up when the person replies.

   1. **Ask clarifying questions** (stage `questions`). Read the ticket and any existing project code, then list the assumptions you'd otherwise have to make. Ask 3–6 focused questions, each **with a proposed default**, so a one-word "defaults are fine" unblocks you:
      ```markdown
      **Questions before I plan this:**

      1. **Storage:** browser IndexedDB, so data stays on this device? *(default: yes)*
      2. **Scope:** just create / complete / delete, or also edit and filter? *(default: create, complete, delete)*
      3. ...

      Reply with answers, or "defaults are fine".
      <!-- factory-loop:questions -->
      ```
      Ask only what changes the build. Don't ask about things the ticket or the repo's `CLAUDE.md` already settle.

   2. **Post a plan for approval** (stage `plan`) once the questions are answered. Fold every answer in. Keep it skimmable:
      ```markdown
      **Plan for approval:**

      **Goal:** <one line>
      **Location:** `<folder>/` (new project | feature in `<project>`)
      **Approach:** <stack, storage, key components, in 2–4 bullets>
      **Files:** <list of files to add/change>
      **Out of scope:** <what you won't do>
      **Verification:** <the browser checks you'll run, and which screenshots you'll attach>

      Reply **approve** to build, or tell me what to change.
      <!-- factory-loop:plan -->
      ```
      **Don't build before approval.** If the reply is feedback rather than approval, revise and re-post the plan.

   3. **Build** to the approved plan, on a branch from `main` (as in 5c.1–2). For a new project, make it complete and runnable: source, a `README.md` saying how to run it, and its own `CLAUDE.md` if the repo's conventions ask for one. Add it to the root `CLAUDE.md` index if there is one.

   4. **Run and verify in the browser with chrome-devtools.** Serve the app locally (e.g. `py -3 -m http.server <port>` or `npx serve`, run in the background), then use the chrome-devtools MCP tools:
      - `new_page` to open the app's local URL (note the `pageId`; `take_screenshot` requires it)
      - `take_snapshot` to get element uids, then `fill` / `click` / `press_key` to walk **every acceptance path from the plan** (create, edit, delete, and so on), including one edge case such as empty input
      - reload with `navigate_page` to check persistence if the app stores data
      - `list_console_messages` must show **no errors** apart from a missing favicon; fix and re-verify otherwise
      - `take_screenshot` with `filePath` at each meaningful state, saved into the project as `<project>/docs/screenshots/ticket-<N>-<step>.png` (e.g. `-1-empty`, `-2-added`, `-3-done`)

      Stop the local server afterwards. If any check fails, fix it and re-run all the checks. Never ship an unverified build.

   5. **Ship it** as in 5c.4–6, committing the screenshots with the code. The PR body lists what was built, the checks run and their results, and embeds the screenshots from the branch:
      `![step](https://github.com/<owner>/<repo>/blob/<branch>/<path>?raw=true)`. Then post the stage `pr` comment and merge.

   6. **Report on the ticket with screenshots** (stage `done`) after the merge, embedding the images from `main` so the links stay valid:
      ```markdown
      **Done:** merged in #<pr>.

      **What was built:** <2–4 bullets>
      **How it was verified (Chrome DevTools):**
      - ✅ <check> …
      - ✅ No console errors

      ![1 empty](https://github.com/<owner>/<repo>/blob/main/<project>/docs/screenshots/ticket-<N>-1-empty.png?raw=true)
      ![2 added](https://github.com/<owner>/<repo>/blob/main/<project>/docs/screenshots/ticket-<N>-2-added.png?raw=true)

      **Run it:** <one line>
      <!-- factory-loop:done -->
      ```
      The `Closes #<N>` merge closes the issue. Always return to `main` last (5c.7), even if a step failed.

   *Choosing between 5c and 5d:* if building it means choosing how something should look or behave, it's **d**. If the ticket fully specifies the result (a file with given contents, a doc with stated sections, a config value), it's **c**. When unsure, choose **d**: one round of questions costs a reply, but a wrong build costs a redo.

6. **Post every comment from a file**, ending with its stage marker. Write the body to a temp file (the scratchpad if one exists), then:
   ```
   gh issue comment N --body-file <path>
   ```
   A file avoids the quoting differences between PowerShell here-strings and Bash heredocs, and it keeps Markdown, backticks and `$` intact.

   Comment shape for an answer:
   ```markdown
   **Answer:** <one-sentence direct answer, key term in bold>

   - <supporting detail / figure, with source>
   - <useful context or comparison>

   <!-- factory-loop:answer -->
   ```
   Lead with the answer, keep it short, and skip the preamble ("Great question!").

7. **Close answered tickets as completed.**
   ```
   gh issue close N --reason completed
   ```
   Close only tickets you answered in 5a. Leave `clarify`, `questions` and `plan` tickets open. Action, project and feature tickets close themselves when their PR merges.

8. **Report** one line per issue: number, title, and what you did (answered + closed / asked for clarification / asked questions / posted plan / PR #n merged + screenshots / PR #n blocked / waiting on a person), with the comment or PR URL. If nothing was open, say the queue is empty.

## Running on a loop

To keep the queue clear:
```
/loop 5m /factory-loop
```
(Add `--label <name>` or `#N` after `/factory-loop` to scope it.) The routing table in step 3 makes repeat ticks cheap and safe: tickets waiting on a person are skipped until they reply. When `/loop` schedules the job, give the user the job ID so they can stop it with one `CronDelete <id>`. When the user says "stop the loop", delete that job.

A tick with nothing to do just says so in one line. Don't print a wall of text every minute.

The project's Stop hook (`.claude/hooks/auto-commit.js`) commits and pushes whatever is left in the working tree when each turn ends. That's a safety net, not the delivery path: ship ticket work through PRs, so every change is tied to its issue.

## Errors

- `gh` not authenticated: tell the user to run `! gh auth login` and stop.
- If a step fails for one issue (rate limit, permissions), report it and move on to the next issue. The next tick recovers through the step 3 routing. A missing comment means the step re-runs; an `answer` marker re-closes; a `pr` marker re-checks and merges.
- If chrome-devtools isn't available or the page won't load, don't ship. Comment (stage `clarify`) saying verification is blocked and why, and leave the PR unmerged.
- If a push or merge is refused (branch protection, a permission prompt that was denied), leave the PR open and report it. Don't try to get around the refusal.

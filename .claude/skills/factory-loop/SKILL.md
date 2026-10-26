---
name: factory-loop
description: Work through the current repo's open GitHub issues one by one and actually deliver them. React with 👀 to show work has started. No ticket is ever closed without a person's approval. Question tickets get an answer and are closed only once the reporter accepts it. Action tickets (files, docs, config, scripts, fixes) become a PR, or take project/feature tickets through clarifying questions → an approved plan → build → in-browser verification with chrome-devtools, with screenshots attached to the ticket. Every PR is sent for review to the ticket's author, then merged once they approve, with requested changes addressed first. Never takes destructive actions. Can run on a recurring loop to keep the queue clear. Use this skill whenever the user says "factory loop", "work the issue queue", "answer the tickets", "process/handle/triage the GitHub issues", "build what the tickets ask for", "respond to open issues and close them", or wants issues watched and delivered automatically, even if they don't name the skill.
---

# Factory Loop

Turn the repo's open GitHub issues into delivered, closed tickets: answers for questions, merged PRs for changes. The skill does **one pass** over the queue. For a recurring loop, wrap it in `/loop` (see "Running on a loop" below) instead of building scheduling into the pass.

It runs autonomously: it reacts, answers, builds and opens PRs without asking first. But **it never closes a ticket on its own judgement.** Every ticket closes only after a person approves:
- **Changes** (files, projects, features): the loop opens a PR and requests review. It merges only after an **approving review**, and the merge (`Closes #N`) is what closes the ticket.
- **Questions:** the loop posts the answer and leaves the ticket open. It closes the ticket only after the reporter **accepts the answer** in a reply.
- Project and feature work also waits for answers to clarifying questions and for **plan approval** on the ticket, before any building starts. All of this is public, and merged code lands on `main`, so the guardrails below are what keep it trustworthy.

## Never destructive

The loop only **adds and edits**. A ticket can never make it destroy something, because a wrong destructive step can't be undone by the next tick:

- **Don't delete or empty** files, folders, branches, tags, issues, PRs, labels, releases or repos. Don't use `rm -rf`, `git clean`, `git branch -D`, `gh pr merge --delete-branch`, `gh repo delete`, and so on.
- **Don't rewrite history:** no `push --force` / `--force-with-lease`, `reset --hard`, `rebase` of pushed commits, or `commit --amend` on pushed commits.
- **Don't wholesale-overwrite** an existing file the ticket didn't name. Make targeted edits instead.
- **Don't discard someone else's uncommitted work** (`checkout -- .`, `stash drop`, `restore`).
- **Don't touch secrets or CI/branch-protection settings**, and don't commit `.env`, keys or credentials.

If a ticket *asks* for any of the above ("delete the old folder", "wipe the history", "remove the label"), don't do it. Treat it as **5b**: say what you understood, say that destructive steps need a person, and leave the ticket open.

## Engineering standards: how code is structured

Every change the loop ships should be **scalable, maintainable and easy to understand** for the next person, or the next ticket. Don't pile features into one big file. A 400-line `app.js` that mixes storage, business rules and DOM code is the thing to avoid: each new ticket makes it harder to change safely.

**Split by responsibility.** Each file does one job, with a name that says what it is. For a client-side web app:

```
<project>/
  index.html            markup only; loads src/main.js as <script type="module">
  styles/               CSS split by area (base.css, components.css, ...)
  src/
    main.js             entry point: wires modules together, no business logic
    state.js            app state + the only place that mutates it
    storage/            persistence (e.g. db.js for IndexedDB, repo.js for task CRUD)
    domain/             pure logic, no DOM, no storage: rules, validation, date maths
    ui/                 rendering + event handling, one module per component
  tests/                node --test unit tests for domain/ (pure functions)
  README.md             how to run, what's where
  CLAUDE.md             the project's conventions and module map (layer 2)
```

Other stacks follow the same idea in their own idiom (routes / services / models for a server, and so on).

**Rules:**
- **Layers only call downward:** `ui → state → domain / storage`. `domain/` never touches the DOM or storage, which keeps it pure and testable. `ui/` never talks to IndexedDB directly.
- **Use ES modules** (`import` / `export`). No globals and no `window.*` state. Every module exports a small, named API.
- **Keep it small:** aim for files under ~150 lines and functions under ~30. If a file grows past that, split it along a responsibility line, not at an arbitrary point.
- **Name things clearly** (`createTask`, `nextDueDate`, `renderTaskList`) and skip clever abbreviations. Comment the *why*, not the *what*.
- **Put constants and config in one place** (`src/config.js`), not as magic numbers spread through the code.
- **Test the logic:** every `domain/` function gets unit tests (`node --test tests/*.test.js`), and they must pass before the PR. Browser checks cover the UI, and unit tests cover the rules.
- **100% coverage, enforced.** A project with an `npm run test:coverage` gate (e.g. `todo/`) must pass it before every PR: every `src/` file loaded by a test and at 100% lines, branches and functions. Cover new UI and storage code with the project's fakes (`tests/helpers/`), never by excluding files or lowering the threshold. New projects get the same gate: copy `todo/scripts/check-coverage.mjs`.
- **No build step unless the project already has one.** Native ES modules work in every current browser. Note that they need the page served over HTTP (`npx serve` or `py -3 -m http.server`), so say so in the README.

**Test-driven development (TDD), always.** Invoke the `superpowers:test-driven-development` skill before writing any feature or fix code, and follow it for every behaviour you add:
1. **Red:** write one small failing test for the next behaviour (`tests/<module>.test.js`, run with `node --test`). Run it and **see it fail for the right reason**. A test that has never failed proves nothing.
2. **Green:** write the minimum code to pass it. Run the tests again; all must pass.
3. **Refactor:** clean up names and duplication with the tests green. Re-run them.

Repeat for each behaviour in the plan. Domain logic (`src/domain/`) is always test-first. UI wiring is covered by the chrome-devtools checks. For a bug fix, the first test reproduces the bug. For a refactor of untested code, write **characterisation tests** of the current behaviour first, so the refactor is proven not to change it.

**Code review before every PR.** Once the build is green and verified, invoke the `superpowers:requesting-code-review` skill on the branch's diff against `main`. Fix every **Critical** and **Important** finding, re-run the tests and checks, and note anything **Minor** you chose not to fix (with the reason) in the PR body under **Code review**. Don't open the PR with an unaddressed Critical or Important finding.

**Security checks before every PR.** After the code review, run both security skills on the change:
1. **`security-audit`** (`.claude/skills/security-audit/`, Cloudflare's audit skill) in **guidance mode**: ask it for a *focused security review of this branch's diff against `main`*, covering the trust boundaries the change touches, such as user input, storage, rendering of user data (XSS), and auth. Guidance mode is source-only and writes no files. **Never trigger its full-audit mode from the loop:** that's six phases with many sub-agents and reports outside the repo. Run it only when a ticket or the user explicitly asks for a full audit or pen test. Follow its rules: no execution of target code without its OS sandbox, and only `confirmed` findings get a severity.
2. **`deepsec`** (`.claude/skills/deepsec/`, Vercel's DeepSec scanner) for a **bounded first pass**: its default limits, never a full or unbounded scan unless the user asks.

What to do with what they find:
- **Critical or High findings (from either) in the code this ticket changed:** fix them test-first, then re-run the check that found them. Don't open the PR while one is unresolved.
- **Medium or Low findings, or findings in code the ticket didn't touch:** don't fix them in this PR. List them in the PR body under **Security scan** so a person can decide, and keep the scope tight.
- **What to commit:** DeepSec keeps its scan state in gitignored locations. Don't commit `.deepsec/` setup or findings files in a ticket PR; summarise the results in the PR body instead. The first DeepSec setup (`.deepsec/` config + `INFO.md`) goes in its own PR.
- **`needs_validation` items** from `security-audit` (a plausible issue that source alone can't settle): list them in the PR body with the exact missing fact. They aren't findings and get no severity.
- **If either check can't run** (DeepSec needs network and AI credentials in the environment; installs can fail): never write credentials to a file to make it work. Say "<check>: not run, because <reason>" in the PR body, and never claim a check passed when it didn't run. The reviewer then decides whether to approve without it.

**This is enforced.** A `PostToolUse` hook (`.claude/hooks/god-object-guard.js`) measures every source file after each write or edit. Over **200 lines** or **15 functions**, it blocks with a "split this file" message. Test, build and vendor files are skipped. Treat a block as a required refactor, not something to work around.

**Existing code that doesn't meet this:** when a ticket adds a feature to a project that's still one big file, the first commit in the PR is a **behaviour-preserving refactor** into the structure above, verified to work exactly as before. The feature lands in later commits. Say so in the plan. Moving code into modules is an edit, not a deletion, so it stays inside "Never destructive". Don't refactor projects the ticket doesn't touch.

## Subagents: delegate the heavy steps

A single long pass fills the context with screenshots, DOM dumps, diffs and web pages, until it has to compact. Hand those steps to the project subagents in `.claude/agents/` with the Agent tool, and keep only their short reports. Give each one a tight brief: ticket number, branch, project folder, and the plan's acceptance paths. Don't pass your own conclusions.

| Step | Subagent | What it returns |
|---|---|---|
| 5a: answer a question (and follow-ups) | `ticket-researcher` | A draft comment with confidence, citing only sources it opened. You review it and post it. |
| 5d.3: build independent plan pieces | `tdd-builder` (one per piece; run them in parallel only if they touch different files) | Commits on the ticket branch, with test results. You push. |
| 5c.3 / 5d.4: browser verification | `browser-verifier` | PASS/FAIL per path, console status, screenshot paths |
| 5c.3 / 5d.5: code review | `code-reviewer` | Critical / Important / Minor findings, plus a real test run |
| 5c.3 / 5d.5: security check | `security-reviewer` | security-audit (guidance, diff) findings, needs_validation items, deepsec status |

You still own every gate: what kind of ticket it is, posting comments, fixing findings (test-first), pushing, opening the PR and merging. A subagent's report is input to check, not a verdict. Spot-check a claim before you act on it. Do small things inline: a one-line doc fix doesn't need a builder.

## Stage markers: how the loop knows where a ticket stands

The loop usually posts under the **same GitHub account** as the person filing and answering tickets, so "who wrote this comment" can't tell the loop's comments apart from the person's replies. Instead, **every comment the loop posts ends with a hidden stage marker**:

```
<!-- factory-loop:STAGE -->
```

| STAGE | Posted when |
|---|---|
| `answer` | a question was answered; waiting for the reporter to accept it (5a) |
| `closing` | the reporter accepted the answer; posted just before closing (step 7) |
| `clarify` | the ticket was too vague or destructive (5b) |
| `questions` | clarifying questions for a project/feature ticket (5d.1) |
| `plan` | a plan was posted for approval (5d.2) |
| `review` | a PR was opened and sent for review, or re-sent after changes (step 9) |
| `done` | the PR was merged after approval; delivery report, with screenshots for 5d (step 9) |

(`pr` is the older name for `review`. Treat it the same way.)

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
   | `answer` | **yes**, accepting ("thanks", "approved", "correct", "lgtm", "close it") | Close it: step 7 |
   | `answer` | **yes**, a follow-up or a correction | Treat it as a new question on the same ticket. Re-check and post a revised answer (stage `answer`), and leave it open |
   | `closing` | no | The close step failed: run step 7 only, without posting another comment |
   | `review` (or `pr`) | — | Check the PR's review state: step 9 |
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

   **a. A question you can answer** (factual, how-to, explanation): write the answer. If it rests on facts that could be wrong or out of date (figures, dates, versions, names), check them with a quick search or the codebase before posting. The comment is public and stays on the ticket, so an answer from memory that turns out wrong costs more than the lookup. Cite a source only if you actually opened it in this run. A citation tells the reader "this was checked here", so citing a page you never read is worse than citing nothing. Post it (step 6, stage `answer`), ending with: *"Reply to confirm this answers it and I'll close the ticket, or tell me what's missing."* **Leave it open.** Step 7 closes it only after the reporter accepts.

   **b. Too vague, or destructive** (unclear what's wanted, asks for a decision only a person can make, or needs any step from "Never destructive"): post a short comment (stage `clarify`) saying what you understood and what's needed to move forward. **Leave it open.** Being autonomous means not waiting for approval. It doesn't mean guessing at, or closing, tickets you can't actually resolve.

   **c. A simple action ticket**: a contained change with no product decisions to make, e.g. create or edit a file, docs like `CLAUDE.md`, config, a script, or a small fix. **Do it**, ship it as a PR, and send it for review:
   1. **Start clean from `main`.** If the working tree has uncommitted changes to tracked files, stop and report, because you'd be shipping someone else's half-done work. Untracked files are fine; just don't `git add` them.
      ```
      git fetch origin
      git checkout -B ticket-<N>-<short-slug> origin/main
      ```
   2. **Build exactly what the ticket asks**, using the paths and names it gives, and follow "Engineering standards". For code, that means **TDD** (red, green, refactor) through `superpowers:test-driven-development`. If the repo has a `CLAUDE.md`, follow its conventions and update its project index for anything new. Keep the scope tight, and stay inside "Never destructive".
   3. **Verify, then get a code review, before you ship.** Run what can be run: unit tests (`node --test`), a build, a lint. Then run `superpowers:requesting-code-review` on the diff and fix every Critical or Important finding. Then run the security checks, `security-audit` (guidance mode, on the diff) and `deepsec` (bounded), and fix any Critical or High finding in the changed code, as in "Engineering standards". For a doc with constraints ("under 100 lines"), measure them. A PR you never ran is a guess.
   4. **Commit, push, open the PR.** Stage only the files you made or changed for this ticket (`git add <paths>`, never `git add -A`). Put `Closes #<N>` in both the commit message and the PR body. Write the PR body to a file, listing what changed and how you verified it.
      ```
      git commit -m "<summary>" -m "Closes #<N>"
      git push -u origin HEAD
      gh pr create --base main --title "<ticket title>" --body-file <path>
      ```
   5. **Send it for review.** Request the **ticket's author** as reviewer. GitHub won't let you review your own PR, so if the author is your login, request the **repo owner** instead. If that's also you, there's nobody to request: say so in the comment and wait for a person to merge.
      ```
      gh pr edit <pr> --add-reviewer <ticket-author>
      ```
      Then comment on the issue (stage `review`):
      ```markdown
      **PR for review:** #<pr>, <one-line summary>. Review requested from @<reviewer>. I'll merge once it's approved, and address any requested changes first.
      <!-- factory-loop:review -->
      ```
      **Don't merge now.** Merging happens in step 9 after approval.
   6. **Always return to `main` last, whatever happened** (sent for review, blocked, or failed partway): `git checkout main && git pull --ff-only`. The Stop hook auto-commits the working tree to the *current* branch, so a pass that ends on `ticket-N` would push unrelated changes into that PR.

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
      **Architecture:** <module layout per "Engineering standards": which files in src/storage, src/domain, src/ui, and which tests. If the project is still one big file, say "commit 1 refactors into modules with no behaviour change">
      **Files:** <list of files to add/change>
      **Out of scope:** <what you won't do>
      **Tests (TDD):** <the behaviours you'll drive test-first, e.g. "nextDueDate: daily / weekly / monthly / month-end / skips past dates">
      **Verification:** <the browser checks you'll run, and which screenshots you'll attach>

      Reply **approve** to build, or tell me what to change.
      <!-- factory-loop:plan -->
      ```
      **Don't build before approval.** If the reply is feedback rather than approval, revise and re-post the plan.

   3. **Build** to the approved plan and its **Architecture** and **Tests** sections, on a branch from `main` (as in 5c.1–2), following "Engineering standards". Use **TDD** through `superpowers:test-driven-development`: for each planned behaviour, write the failing test, watch it fail, make it pass, then refactor. If the plan calls for a refactor first, pin the current behaviour with characterisation tests, then do the refactor in a commit of its own. Re-run those tests and the existing browser checks to prove nothing changed, then build the feature test-first in further commits. For a new project, make it complete and runnable: the module layout, unit tests for `domain/`, a `README.md` saying how to run it and what's where, and its own `CLAUDE.md` with the module map. Add it to the root `CLAUDE.md` index if there is one.

   4. **Run the unit tests and the coverage gate (`npm run test:coverage` where the project has one, otherwise `node --test tests/*.test.js`); all must pass. Then run and verify in the browser with chrome-devtools.** Serve the app locally (e.g. `py -3 -m http.server <port>` or `npx serve`, run in the background), then use the chrome-devtools MCP tools:
      - `new_page` to open the app's local URL (note the `pageId`; `take_screenshot` requires it)
      - `take_snapshot` to get element uids, then `fill` / `click` / `press_key` to walk **every acceptance path from the plan** (create, edit, delete, and so on), including one edge case such as empty input
      - reload with `navigate_page` to check persistence if the app stores data
      - `list_console_messages` must show **no errors** apart from a missing favicon; fix and re-verify otherwise
      - `take_screenshot` with `filePath` at each meaningful state, saved into the project as `<project>/docs/screenshots/ticket-<N>-<step>.png` (e.g. `-1-empty`, `-2-added`, `-3-done`)

      Stop the local server afterwards. If any check fails, fix it and re-run all the checks. Never ship an unverified build.

   5. **Code review and security scan, then ship it for review.** Run `superpowers:requesting-code-review` on the branch diff, and fix the Critical and Important findings. Then run the security checks, `security-audit` (guidance mode, focused on the diff) and `deepsec` (bounded first pass), and fix any Critical or High finding in the changed code, test-first. Re-run the tests and browser checks, retaking screenshots if the UI changed. Then ship as in 5c.4–6, committing the screenshots with the code. Add a **Code review** section to the PR body with what the review found and what you fixed, and a **Security** section with both results (`security-audit` and `deepsec`): findings fixed, findings and `needs_validation` items left for a person to decide, or "not run, because <reason>". The PR body lists what was built, the checks run and their results, and embeds the screenshots from the branch, so the reviewer can see the result without running it:
      `![step](https://github.com/<owner>/<repo>/blob/<branch>/<path>?raw=true)`. Then request the review and post the stage `review` comment. Don't merge yet.

   6. **Once it's approved and merged (step 9), report on the ticket with screenshots** (stage `done`), embedding the images from `main` so the links stay valid:
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
      The `Closes #<N>` merge closes the issue. Always return to `main` last (5c.6), even if a step failed.

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

7. **Close a question ticket only after the reporter accepts the answer.** This runs only from the step 3 route (an accepting human reply after an `answer` comment), never in the same pass that posted the answer. First post a one-line comment (stage `closing`), e.g. `Thanks for confirming, closing this.`, then:
   ```
   gh issue close N --reason completed
   ```
   **Never call `gh issue close` anywhere else.** Leave `clarify`, `questions`, `plan` and `review` tickets open. Change tickets close only when a person has approved the PR and it merges with `Closes #N`.

8. **Report** one line per issue: number, title, and what you did (answered, awaiting confirmation / closed after confirmation / asked for clarification / asked questions / posted plan / PR #n sent for review / changes addressed, re-requested review / PR #n merged after approval / PR #n blocked / waiting on a person), with the comment or PR URL. If nothing was open, say the queue is empty.

9. **Follow PRs through review.** For an issue whose latest loop comment is `review` (or legacy `pr`), read the PR:
   ```
   gh pr view <pr> --json state,reviewDecision,reviews,mergeable,statusCheckRollup,commits
   ```
   Use the PR's state, plus the **latest review from each reviewer that came after the PR's last commit**. A review on an older commit is stale.

   | PR state | Do |
   |---|---|
   | **Merged** (a person merged it) | Post the stage `done` report (with screenshots for 5d). The issue closes through `Closes #N`. |
   | **Closed**, not merged | A person decided against it. Comment once (stage `clarify`) asking what to change, and leave the issue open. |
   | **Approved** (`reviewDecision: APPROVED`, or the latest current review is `APPROVED`), mergeable, checks green | `gh pr merge <pr> --squash` (no `--delete-branch`), then post the stage `done` report. |
   | **Changes requested** | Address the feedback (below). |
   | Approved but conflicting or failing checks | Don't force it. Comment on the PR with the cause and skip. A person needs to look. |
   | Review still pending | Waiting on the reviewer. Skip. |

   **Addressing requested changes:** read every review comment (`gh api repos/{owner}/{repo}/pulls/<pr>/comments` for line comments, plus the review bodies). Handle them through the `superpowers:receiving-code-review` skill: check each point against the code, fix what's right, and push back with evidence on anything technically wrong rather than agreeing for the sake of it. Each fix is test-first: a failing test for the reported problem, then the fix. Then:
   1. Check out the PR branch: `git fetch origin && git checkout <branch> && git pull --ff-only`.
   2. Make the changes, staying inside the approved plan and "Never destructive". If the feedback changes scope, treat it like plan feedback: reply on the PR and ask.
   3. **Verify again** the same way as the original build: tests, code review and both security checks (`security-audit` on the new diff, `deepsec`) on the new changes. For 5d that also means the chrome-devtools checks again, with fresh screenshots that replace the old ones under the same names.
   4. Commit and push as **new commits**, never force-push. Then reply on the PR saying what changed for each point, and re-request review: `gh pr edit <pr> --add-reviewer <reviewer>`.
   5. Comment on the issue (stage `review`): `**Updated for review:** #<pr>, addressed: <short list>. Review re-requested from @<reviewer>.`
   6. Return to `main` (5c.6).

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
- If a step fails for one issue (rate limit, permissions), report it and move on to the next issue. The next tick recovers through the step 3 routing. A missing comment means the step re-runs; a `closing` marker re-closes (the reporter already accepted); a `review` marker re-reads the PR's review state. An `answer` marker on its own never closes anything.
- If the reviewer can't be requested (not a collaborator, or it's yourself), say so in the `review` comment and leave the PR for a person to review and merge. Don't merge unreviewed.
- If chrome-devtools isn't available or the page won't load, don't ship. Comment (stage `clarify`) saying verification is blocked and why, and leave the PR unmerged.
- If a push or merge is refused (branch protection, a permission prompt that was denied), leave the PR open and report it. Don't try to get around the refusal.

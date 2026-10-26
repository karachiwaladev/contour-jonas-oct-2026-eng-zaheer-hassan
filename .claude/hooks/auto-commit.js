#!/usr/bin/env node
// Stop hook: commit whatever changed in the working tree and push it to the
// current branch. Non-destructive by design:
//   - never stages deletions (git add --ignore-removal)
//   - never force-pushes; a rejected push is reported, not retried
//   - skips mid-merge/rebase, detached HEAD, and likely secrets
// Pass --dry-run to print what would happen without committing or pushing.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dryRun = process.argv.includes("--dry-run");
const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Files that should never be auto-committed.
const SECRET = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12|pfx)|id_(rsa|ed25519|ecdsa)(\.pub)?|credentials(\.json)?)$/i;
const NOISE = /(^|\/)(\.playwright-mcp\/|node_modules\/|\.claude\/scheduled_tasks\.lock$)/;

const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// Collected notes are shown to the user (via the UI) once, without blocking the stop.
const notes = [];
function say(msg) { notes.push(msg); }

function main() {
  try { git("rev-parse", "--is-inside-work-tree"); } catch { return; }

  const gitDir = git("rev-parse", "--git-dir");
  const busy = ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"]
    .some((f) => fs.existsSync(path.resolve(cwd, gitDir, f)));
  if (busy) return say("skipped, a merge or rebase is in progress");

  const branch = git("branch", "--show-current");
  if (!branch) return say("skipped, detached HEAD");

  // Candidate paths: modified/untracked, never deleted ones. -z keeps the
  // "XY path" columns intact (no trimming, no quoting of odd names).
  const entries = execFileSync("git", ["status", "--porcelain", "-z", "-uall"], { cwd, encoding: "utf8" })
    .split("\0").filter(Boolean);
  const changed = [];
  for (let i = 0; i < entries.length; i++) {
    const xy = entries[i].slice(0, 2);
    if (/[RC]/.test(xy)) i++; // a rename/copy is followed by its original path
    if (xy.includes("D")) continue;
    changed.push(entries[i - (/[RC]/.test(xy) ? 1 : 0)].slice(3));
  }

  const skipped = changed.filter((p) => SECRET.test(p));
  const toAdd = changed.filter((p) => !SECRET.test(p) && !NOISE.test(p));
  if (!toAdd.length) return skipped.length ? say(`nothing committed; skipped possible secrets: ${skipped.join(", ")}`) : undefined;

  if (dryRun) {
    console.log(JSON.stringify({ branch, wouldCommit: toAdd, skippedSecrets: skipped }, null, 2));
    return;
  }

  git("add", "--ignore-removal", "--", ...toAdd);
  const staged = git("diff", "--cached", "--name-only");
  if (!staged) return;

  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  git("commit", "-m", `chore: auto-commit on stop (${stamp} UTC)`, "-m",
      "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>");

  try {
    git("push", "origin", `HEAD:refs/heads/${branch}`);
    say(`committed and pushed ${staged.split("\n").length} file(s) to ${branch}`);
  } catch (e) {
    say(`committed locally on ${branch}, but push was rejected (${(e.stderr || e.message).split("\n")[0]}). Not forcing; pull and push manually.`);
  }
  if (skipped.length) say(`skipped possible secrets: ${skipped.join(", ")}`);
}

try { main(); } catch (e) { say(`error: ${e.message.split("\n")[0]}`); }
if (notes.length) process.stdout.write(JSON.stringify({ systemMessage: `auto-commit: ${notes.join("; ")}` }) + "\n");

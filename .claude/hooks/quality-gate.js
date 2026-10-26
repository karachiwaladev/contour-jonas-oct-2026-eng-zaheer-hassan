#!/usr/bin/env node
// PreToolUse hook (Bash|PowerShell): the quality gate before a PR. When the
// command opens a PR (`gh pr create`), it runs `npm run eval` (coverage gate +
// Stryker mutation testing) in every project the branch changes that defines
// one. Any failure blocks the PR (exit 2), and the tail of the output goes back
// to Claude. Other commands pass straight through.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TRIGGER = /\bgh\s+pr\s+create\b/;
const TAIL_LINES = 40;

function readInput() {
  // Strip a BOM: Windows shells can prepend one when piping, and JSON.parse rejects it.
  try { return JSON.parse(fs.readFileSync(0, "utf8").replace(/^﻿/, "") || "{}"); } catch { return {}; }
}

function git(args, cwd) {
  try { return execSync(`git ${args}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; }
}

// Files the PR would ship: committed on the branch, plus anything not yet committed.
function changedFiles(root) {
  const committed = git("diff --name-only origin/main...HEAD", root);
  const working = git("diff --name-only HEAD", root);
  return [...new Set((committed + working).split(/\r?\n/).filter(Boolean))];
}

function hasEval(dir) {
  const pkg = path.join(dir, "package.json");
  if (!fs.existsSync(pkg)) return false;
  try { return Boolean(JSON.parse(fs.readFileSync(pkg, "utf8")).scripts?.eval); } catch { return false; }
}

// The nearest folder above a changed file whose package.json has an eval script.
function projectFor(root, file) {
  let dir = path.dirname(path.join(root, file));
  while (dir.startsWith(root) && dir !== root) {
    if (hasEval(dir)) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

function tail(text) {
  return text.split(/\r?\n/).filter((l) => l.trim()).slice(-TAIL_LINES).join("\n");
}

function runEval(dir) {
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    return { ok: false, output: `node_modules missing: run \`npm ci\` in ${dir} first.` };
  }
  try {
    execSync("npm run eval", { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: tail(`${err.stdout || ""}\n${err.stderr || ""}`) };
  }
}

function main() {
  const input = readInput();
  const command = (input.tool_input && input.tool_input.command) || "";
  if (!TRIGGER.test(command)) return;

  const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  const projects = [...new Set(changedFiles(root).map((f) => projectFor(root, f)).filter(Boolean))];

  const failures = projects
    .map((dir) => ({ dir, ...runEval(dir) }))
    .filter((r) => !r.ok);
  if (!failures.length) return;

  const report = failures
    .map((f) => `## ${path.relative(root, f.dir)}: npm run eval failed\n${f.output}`)
    .join("\n\n");
  process.stderr.write(
    "Quality gate blocked the PR: coverage must be 100% and every mutant killed.\n" +
    "Fix it with real tests (never by lowering thresholds or excluding code), then open the PR again.\n\n" +
    report + "\n");
  process.exit(2);
}

main();

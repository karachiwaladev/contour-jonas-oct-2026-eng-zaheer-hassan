// Shared plumbing for the factory's hooks: read the hook's JSON from stdin,
// block with a reason, and find the current git branch.
const fs = require("fs");
const { execFileSync } = require("child_process");

// Fail open on unreadable input: a guard that blocks every call when the
// stdin shape changes would brick the session. The parse error goes to stderr.
function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").replace(/^﻿/, "");
    return JSON.parse(raw || "{}");
  } catch (err) {
    process.stderr.write(`hook: could not parse input (${err.message}); allowing\n`);
    return {};
  }
}

// Exit 2 blocks the tool call (PreToolUse) or feeds the reason back (PostToolUse).
function block(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

function currentBranch(cwd) {
  if (process.env.FACTORY_BRANCH_OVERRIDE) return process.env.FACTORY_BRANCH_OVERRIDE;
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Ticket branches are where ticket-driven (untrusted) work happens.
function onTicketBranch(cwd) {
  return /^ticket-/.test(currentBranch(cwd));
}

module.exports = { readInput, block, currentBranch, onTicketBranch };

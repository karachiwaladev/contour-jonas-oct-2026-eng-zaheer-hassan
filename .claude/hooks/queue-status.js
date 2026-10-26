#!/usr/bin/env node
// factory-loop helper: print one routing line per open issue, so a tick doesn't
// need an inline eval. Usage: node .claude/hooks/queue-status.js [N ...]
// Output per issue: "#N <title> | stage=<latest loop stage|none> | replies=<count> | <first reply, trimmed>"
const { execFileSync } = require("child_process");

const MARKER = /<!-- factory-loop:([a-z]+)/;

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function loadIssues(numbers) {
  const fields = "number,title,author,comments,state";
  if (!numbers.length) {
    return JSON.parse(gh(["issue", "list", "--state", "open", "--limit", "100", "--json", fields]));
  }
  return numbers
    .map((n) => JSON.parse(gh(["issue", "view", String(n), "--json", fields])))
    .filter((i) => i.state === "OPEN");
}

// Legacy issues (no markers): own-login comments count as the loop's only if we reacted 👀.
function hasOwnEyes(repo, number, me) {
  const out = gh(["api", `repos/${repo}/issues/${number}/reactions`,
    "--jq", `[.[] | select(.content=="eyes" and .user.login=="${me}")] | length`]);
  return Number(out.trim()) > 0;
}

function route(issue, repo, me) {
  const comments = issue.comments || [];
  let last = -1;
  comments.forEach((c, i) => { if (MARKER.test(c.body)) last = i; });

  let stage = last >= 0 ? comments[last].body.match(MARKER)[1] : "none";
  let replies = comments.slice(last + 1);

  if (last < 0 && comments.length && hasOwnEyes(repo, issue.number, me)) {
    stage = "legacy";
    replies = comments.filter((c, i) => i > lastIndexBy(comments, me));
  }
  const first = replies[0] ? replies[0].body.replace(/\s+/g, " ").slice(0, 200) : "";
  return `#${issue.number} ${issue.title} | stage=${stage} | replies=${replies.length}${first ? " | " + first : ""}`;
}

function lastIndexBy(comments, login) {
  let idx = -1;
  comments.forEach((c, i) => { if (c.author && c.author.login === login) idx = i; });
  return idx;
}

const repo = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).trim();
const me = gh(["api", "user", "-q", ".login"]).trim();
const numbers = process.argv.slice(2).map((a) => a.replace(/^#/, "")).filter(Boolean);
const issues = loadIssues(numbers);

if (!issues.length) console.log("queue empty");
for (const issue of issues) console.log(route(issue, repo, me));

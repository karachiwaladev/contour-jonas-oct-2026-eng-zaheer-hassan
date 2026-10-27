#!/usr/bin/env node
// factory-loop helper: print one routing line per open issue, so a tick doesn't
// need an inline eval. Usage: node .claude/hooks/queue-status.js [N ...]
// Output per issue:
//   "#N <title> | stage=<stage|none|legacy> | replies=<n> | trusted=<n> | flags=<labels> | <first reply>"
// Only markers in comments written by our own login count, so a forged marker
// can't move a ticket. "trusted" counts replies from the ticket author or a
// collaborator with write access; only those may approve or answer.
const { execFileSync } = require("child_process");
const { scanText } = require("./lib/injection-patterns");

const MARKER = /<!-- factory-loop:([a-z]+)/;
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function loadIssues(numbers) {
  const fields = "number,title,body,author,comments,state";
  if (!numbers.length) {
    return JSON.parse(gh(["issue", "list", "--state", "open", "--limit", "100", "--json", fields]));
  }
  return numbers
    .map((n) => JSON.parse(gh(["issue", "view", String(n), "--json", fields])))
    .filter((i) => i.state === "OPEN");
}

const permissionCache = new Map();
function hasWriteAccess(repo, login) {
  if (!LOGIN.test(login)) return false;
  if (!permissionCache.has(login)) {
    let ok = false;
    try {
      const perm = gh(["api", `repos/${repo}/collaborators/${login}/permission`, "-q", ".permission"]).trim();
      ok = ["admin", "maintain", "write"].includes(perm);
    } catch { ok = false; }
    permissionCache.set(login, ok);
  }
  return permissionCache.get(login);
}

// Legacy issues (no markers): own-login comments count as the loop's only if we reacted 👀.
function hasOwnEyes(repo, number, me) {
  const out = gh(["api", `repos/${repo}/issues/${number}/reactions`,
    "--jq", `[.[] | select(.content=="eyes" and .user.login=="${me}")] | length`]);
  return Number(out.trim()) > 0;
}

const authorOf = (c) => (c.author && c.author.login) || "";
const isLoopComment = (c, me) => authorOf(c) === me && MARKER.test(c.body || "");

function lastIndex(comments, pred) {
  let idx = -1;
  comments.forEach((c, i) => { if (pred(c)) idx = i; });
  return idx;
}

function route(issue, repo, me) {
  const comments = issue.comments || [];
  let last = lastIndex(comments, (c) => isLoopComment(c, me));
  let stage = last >= 0 ? comments[last].body.match(MARKER)[1] : "none";

  if (last < 0 && comments.length && LOGIN.test(me) && hasOwnEyes(repo, issue.number, me)) {
    stage = "legacy";
    last = lastIndex(comments, (c) => authorOf(c) === me);
  }
  const replies = comments.slice(last + 1).filter((c) => !isLoopComment(c, me));
  const ticketAuthor = (issue.author && issue.author.login) || "";
  const trusted = replies.filter((c) => authorOf(c) === ticketAuthor || hasWriteAccess(repo, authorOf(c)));

  const flags = new Set(scanText(`${issue.title}\n${issue.body || ""}`));
  for (const c of comments) if (!isLoopComment(c, me)) scanText(c.body).forEach((f) => flags.add(f));
  if (ticketAuthor !== me && !hasWriteAccess(repo, ticketAuthor)) flags.add("untrusted-author");

  const first = replies[0]
    ? `${authorOf(replies[0])}${trusted.includes(replies[0]) ? "" : "(untrusted)"}: ${replies[0].body.replace(/\s+/g, " ").slice(0, 200)}`
    : "";
  return `#${issue.number} ${issue.title} | stage=${stage} | replies=${replies.length} | trusted=${trusted.length}` +
    ` | flags=${flags.size ? [...flags].join(",") : "none"}${first ? " | " + first : ""}`;
}

const repo = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).trim();
const me = gh(["api", "user", "-q", ".login"]).trim();
const numbers = process.argv.slice(2).map((a) => a.replace(/^#/, "")).filter(Boolean);
const issues = loadIssues(numbers);

if (!issues.length) console.log("queue empty");
for (const issue of issues) console.log(route(issue, repo, me));

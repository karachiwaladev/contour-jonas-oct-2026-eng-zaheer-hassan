// Rules for command-guard.js: shell commands the loop must never run on its
// own, because they're irreversible, outward-facing, or leak secrets. A person
// can still run any of them by hand. Each rule is [label, regex, reason].
const ALWAYS = [
  ["force-push", /\bgit\b[^\n;|&]*\bpush\b[^\n;|&]*(\s--force(-with-lease)?\b|\s-f\b|\s\+\S)/i, "force-pushing rewrites shared history"],
  ["reset-hard", /\bgit\b[^\n;|&]*\breset\b[^\n;|&]*--hard\b/i, "git reset --hard discards work"],
  ["rebase", /\bgit\b[^\n;|&]*\brebase\b/i, "rebasing rewrites history"],
  ["amend", /\bgit\b[^\n;|&]*\bcommit\b[^\n;|&]*--amend\b/i, "amending rewrites a commit"],
  ["branch-delete", /\bgit\b[^\n;|&]*\bbranch\b[^\n;|&]*(\s-d\b|\s-D\b|--delete\b)|\bgit\b[^\n;|&]*\bpush\b[^\n;|&]*(--delete\b|\s:\S)/i, "deleting a branch"],
  ["git-clean", /\bgit\b[^\n;|&]*\bclean\b[^\n;|&]*-[a-z]*f/i, "git clean deletes untracked files"],
  ["discard-changes", /\bgit\b[^\n;|&]*\b(checkout\s+(\S+\s+)?--\s|stash\s+(drop|clear)\b|restore\b(?![^\n;|&]*--staged))/i, "discarding uncommitted work"],
  ["recursive-delete", /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)\b|\b(Remove-Item|rmdir|rd|del)\b[^\n;|&]*-Recurse\b|\brmdir\s+\/s\b/i, "recursive delete"],
  ["merge-delete-branch", /\bgh\s+pr\s+merge\b[^\n;|&]*(--delete-branch|\s-d\b)/i, "merging with --delete-branch deletes the branch"],
  ["gh-delete", /\bgh\s+(repo|issue|label|release|run|cache|gist|secret|variable|ssh-key|gpg-key)\s+delete\b/i, "deleting GitHub objects"],
  ["repo-settings", /\bgh\s+repo\s+(edit|rename|archive|transfer)\b/i, "changing repository settings"],
  ["gh-secrets", /\bgh\s+(secret|variable)\b|\bgh\s+auth\s+(token|refresh|logout|setup-git)\b/i, "touching GitHub credentials or secrets"],
  ["api-delete", /\bgh\s+api\b[^\n;|&]*(-X|--method)\s*(DELETE|PUT|PATCH)\b/i, "a destructive GitHub API call (DELETE/PUT/PATCH)"],
  ["api-admin", /\bgh\s+api\b[^\n;|&]*\/(branches\/[^\s/]+\/protection|collaborators|invitations|hooks|keys|actions\/secrets|environments|rulesets)\b/i, "changing access, protection, webhooks or secrets"],
  ["pipe-to-shell", /\b(curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^\n]*\|\s*(sh|bash|zsh|pwsh|powershell|iex|Invoke-Expression)\b/i, "piping a download into a shell"],
  ["invoke-expression", /\b(iex|Invoke-Expression)\b|\b(powershell|pwsh)\b[^\n]*\s-e(nc(odedcommand)?)?\s/i, "running dynamically built or encoded code"],
  ["upload", /\b(curl|wget)\b[^\n]*(\s-d\b|--data|\s-F\b|--form|-T\b|--upload-file|--post-(data|file))|\b(iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^\n]*-(Method\s+(Post|Put)|Body|InFile)\b/i, "sending data to a remote host"],
  ["read-secrets", /(^|[\s"'=\/\\])(\.env(?!\.(example|sample|template)\b)(\.[\w.-]+)?|id_(rsa|ed25519|ecdsa)[\w.]*|[\w.-]+\.(pem|key|pfx|p12))(["'\s]|$)|\.ssh[\/\\]|\.aws[\/\\]credentials|\.git-credentials|\.npmrc|hosts\.yml/i, "reading or writing secret files"],
  ["dump-env", /(^|[\s;|&(])(printenv|env)(\s*$|\s*[|;&>])|\bGet-ChildItem\s+env:|\bdir\s+env:|\bls\s+env:|\$env:[A-Z_]*(TOKEN|KEY|SECRET|PASSWORD)/i, "dumping environment variables"],
  ["disable-hooks", /--no-verify\b|core\.hooksPath|disableAllHooks/i, "bypassing git or Claude Code hooks"],
];

// Extra rules while working a ticket: ticket text is untrusted, so ticket work
// may not change the loop itself or sweep unrelated files into a PR.
const TICKET_BRANCH = [
  ["add-all", /\bgit\s+add\s+(-A\b|--all\b|\.(\s|$)|\*)/i, "git add -A/. on a ticket branch; stage only the ticket's files"],
  ["loop-files", /(\.claude[\/\\]|\.github[\/\\])/i, "ticket work may not touch .claude/ or .github/ (the loop's own config)"],
];

// Read-only commands that may mention .claude/ on a ticket branch.
const READ_ONLY_LOOP = /^\s*(node\s+["']?[^\s"']*\.claude[\/\\]hooks[\/\\]queue-status\.js|git\s+(diff|log|show|status)|cat|type|Get-Content|head|tail|ls|dir|Get-ChildItem|grep|rg|Select-String)\b/i;

function check(command, { ticketBranch }) {
  for (const [label, re, reason] of ALWAYS) if (re.test(command)) return { label, reason };
  if (!ticketBranch) return null;
  for (const [label, re, reason] of TICKET_BRANCH) {
    if (label === "loop-files" && READ_ONLY_LOOP.test(command)) continue;
    if (re.test(command)) return { label, reason };
  }
  return null;
}

module.exports = { check, ALWAYS, TICKET_BRANCH };

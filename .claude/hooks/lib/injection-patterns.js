// Prompt-injection signals in text the loop reads (issue bodies, comments, PR
// reviews, command output). Detection only: a match is a reason to treat the
// text as hostile data and ask a person, never a reason to stop reading.
// Keep patterns specific; ordinary ticket prose must not trip them.
const PATTERNS = [
  ["instruction-override", /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your|the)\b[^.\n]{0,20}\b(instructions?|rules|prompt|guidelines|directives)\b/i],
  ["role-hijack", /\b(you are now|act as|pretend to be|new instructions|from now on you)\b[^.\n]{0,60}\b(assistant|agent|ai|claude|system|admin|developer mode)\b/i],
  ["fake-system-turn", /(^|\n)\s*(system|assistant|developer)\s*:\s|<\/?(system|system-reminder|assistant|tool_use|function_calls|antml:[a-z_]+)>/i],
  ["secret-request", /\b(print|reveal|show|send|post|leak|dump|output|exfiltrate|upload|paste)\b[^.\n]{0,40}\b(system prompt|api[_ -]?keys?|tokens?|secrets?|credentials?|passwords?|\.env|env(ironment)? var(iable)?s?|ssh keys?|gh auth token)\b/i],
  ["pipe-to-shell", /\b(curl|wget|iwr|invoke-webrequest|irm|invoke-restmethod)\b[^\n|]*\|\s*(sh|bash|zsh|pwsh|powershell|iex|invoke-expression)\b/i],
  ["encoded-payload", /\b(base64\s+(-d|--decode)|frombase64string|-enc(odedcommand)?\s+[A-Za-z0-9+/=]{20,})/i],
  ["hidden-text", /[​-‏‪-‮⁠-⁤﻿]/],
  ["tamper-guardrails", /\b(disable|remove|delete|bypass|skip|turn off|edit|modify|weaken)\b[^.\n]{0,40}\b(hooks?|guards?|quality gate|settings\.json|factory-loop skill|SKILL\.md|branch protection|review requirement|safety)\b/i],
  ["access-change", /\b(add|invite|grant)\b[^.\n]{0,40}\b(collaborator|admin|write access|owner|maintainer)\b|\b(make|set)\b[^.\n]{0,30}\b(repo(sitory)?)\b[^.\n]{0,20}\bpublic\b/i],
  ["force-push", /\bgit\s+push\b[^\n]*(--force\b|-f\b|--force-with-lease)|\bgit\s+reset\s+--hard\b/i],
];

const MARKER = /<!--\s*factory-loop:/i;
const HIDDEN_COMMENT = /<!--(?![\s]*factory-loop:)[\s\S]*?-->/g;
const IMPERATIVE = /\b(run|execute|ignore|delete|push|merge|approve|close|reveal|send|curl|install)\b/i;

// Returns the labels of every signal found, without echoing the payload.
function scanText(text, { fromLoop = false } = {}) {
  if (!text) return [];
  const found = new Set();
  for (const [label, re] of PATTERNS) if (re.test(text)) found.add(label);
  // A stage marker in text the loop didn't write is a forged routing signal.
  if (!fromLoop && MARKER.test(text)) found.add("forged-marker");
  for (const comment of text.match(HIDDEN_COMMENT) || []) {
    if (IMPERATIVE.test(comment)) found.add("hidden-instructions");
  }
  return [...found];
}

module.exports = { scanText, PATTERNS, MARKER };

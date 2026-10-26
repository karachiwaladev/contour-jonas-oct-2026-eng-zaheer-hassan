#!/usr/bin/env node
// Stop hook: append every human prompt from this session that isn't logged yet
// to .claude/logs/prompts.jsonl (one JSON object per line).
// Reads the hook payload ({session_id, transcript_path, cwd, ...}) from stdin.
const fs = require("fs");
const path = require("path");

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = path.join(projectDir, ".claude", "logs", "prompts.jsonl");

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
}

function promptText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const payload = JSON.parse(input || "{}");
  const transcript = payload.transcript_path;
  if (!transcript) return;

  // Prompts already logged, so each Stop only appends the new ones.
  const seen = new Set(readJsonl(logFile).map((r) => r.uuid));

  const fresh = readJsonl(transcript)
    .filter((e) => e.type === "user" && e.origin && e.origin.kind === "human" && !seen.has(e.uuid))
    .map((e) => ({
      timestamp: e.timestamp,
      session_id: e.sessionId || payload.session_id,
      uuid: e.uuid,
      git_branch: e.gitBranch,
      prompt: promptText(e.message && e.message.content),
    }));

  if (!fresh.length) return;
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, fresh.map((r) => JSON.stringify(r)).join("\n") + "\n");
});

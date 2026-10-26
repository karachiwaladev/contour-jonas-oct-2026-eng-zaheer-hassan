#!/usr/bin/env node
// PostToolUse hook (Write|Edit): stops source files growing into "god objects".
// After a write, measures the file. If it has too many lines or too many
// functions, it returns decision "block" so Claude must split it into modules
// before carrying on. See "Engineering standards" in the factory-loop skill.
const fs = require("fs");
const path = require("path");

const LIMITS = { lines: 200, functions: 15 };
const SOURCE = /\.(m?js|cjs|jsx|ts|tsx|py)$/i;
const SKIP = /(^|[\\/])(node_modules|dist|build|vendor|tests?|__tests__)([\\/]|$)|\.(test|spec|min)\.[a-z]+$/i;

// Rough but language-aware function count: declarations, arrow/function
// expressions bound to names, class methods, and Python defs.
const FUNCTION_PATTERNS = {
  js: [
    /^\s*(export\s+)?(default\s+)?(async\s+)?function\s*\*?\s*\w*\s*\(/gm,
    /^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?(\([^)]*\)|\w+)\s*=>/gm,
    /^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function\b/gm,
    /^\s+(static\s+)?(async\s+)?(get\s+|set\s+)?(?!if\b|for\b|while\b|switch\b|catch\b|return\b)\w+\s*\([^)]*\)\s*\{/gm,
  ],
  py: [/^\s*(async\s+)?def\s+\w+\s*\(/gm],
};

function countFunctions(src, file) {
  const patterns = /\.py$/i.test(file) ? FUNCTION_PATTERNS.py : FUNCTION_PATTERNS.js;
  return patterns.reduce((n, re) => n + (src.match(re) || []).length, 0);
}

function readInput() {
  try { return JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}

function main() {
  const input = readInput();
  const file = (input.tool_response && input.tool_response.filePath) || (input.tool_input && input.tool_input.file_path);
  if (!file || !SOURCE.test(file) || SKIP.test(file) || !fs.existsSync(file)) return;

  const src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/).length;
  const functions = countFunctions(src, file);
  const problems = [];
  if (lines > LIMITS.lines) problems.push(`${lines} lines (limit ${LIMITS.lines})`);
  if (functions > LIMITS.functions) problems.push(`${functions} functions (limit ${LIMITS.functions})`);
  if (!problems.length) return;

  const name = path.basename(file);
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason:
      `God-object guard: ${name} has ${problems.join(" and ")}. ` +
      "Split it by responsibility before continuing: move storage, pure domain logic, " +
      "UI rendering and wiring into separate modules (e.g. src/storage/, src/domain/, src/ui/, src/main.js), " +
      "each with a small named export API. Keep behaviour identical and re-run the tests and browser checks. " +
      "Follow 'Engineering standards' in .claude/skills/factory-loop/SKILL.md.",
  }) + "\n");
}

try { main(); } catch { /* never break the session over a measurement error */ }

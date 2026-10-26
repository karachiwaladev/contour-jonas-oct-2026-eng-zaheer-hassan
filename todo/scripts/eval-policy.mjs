// Anti-cheat rules for `npm run eval`. Each check returns a list of problems
// (empty = OK). The coverage and mutation thresholds are only meaningful if code
// can't be quietly excluded, so exclusions are narrow, visible and justified.
import { isDeepStrictEqual } from "node:util";

// The only allowed exclusion: one line, named mutators (never "all"), a reason,
// and nothing else on the line (a second directive there would also be parsed).
const ALLOWED = /^\s*\/\/ Stryker disable next-line (?!all\b)[A-Za-z]+(,(?!all\b)[A-Za-z]+)*: \S.{9,}$/;

export function ignoreCommentProblems(name, text) {
  return text.split(/\r?\n/).flatMap((line, i) => {
    const where = `${name}:${i + 1}`;
    if (line.includes("node:coverage")) return [`${where}: node:coverage comments are not allowed`];
    const mentions = line.match(/Stryker/g)?.length ?? 0;
    if (mentions === 0) return [];
    if (mentions === 1 && ALLOWED.test(line)) return [];
    return [`${where}: only "// Stryker disable next-line <Mutator>: <reason>" on a line of its own is allowed`];
  });
}

const FORBIDDEN_OPTIONS = ["ignorers", "ignoreStatic", "incremental", "dryRunOnly", "mutator"];

export function strykerConfigProblems(config) {
  const problems = [];
  if (config.thresholds?.break !== 100) problems.push("stryker: thresholds.break must be 100");
  if (!isDeepStrictEqual(config.mutate, ["src/**/*.js"])) problems.push('stryker: mutate must be exactly ["src/**/*.js"]');
  if (!isDeepStrictEqual(config.tap?.testFiles, ["tests/*.test.js"])) {
    problems.push('stryker: tap.testFiles must be exactly ["tests/*.test.js"]');
  }
  for (const key of FORBIDDEN_OPTIONS) {
    if (key in config) problems.push(`stryker: "${key}" would exclude code or skip mutants; not allowed`);
  }
  return problems;
}

const REQUIRED_SCRIPTS = {
  "test:coverage": "node scripts/check-coverage.mjs",
  "test:mutation": "stryker run",
  eval: "npm run test:coverage && npm run test:mutation",
};

export function scriptProblems(scripts) {
  return Object.entries(REQUIRED_SCRIPTS)
    .filter(([name, command]) => scripts[name] !== command)
    .map(([name, command]) => `package.json: script "${name}" must be "${command}"`);
}

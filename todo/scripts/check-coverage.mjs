// Coverage gate: every file under src/ must have 100% line, branch and function
// coverage from the unit tests, with no blanket ignore comments. Node's own thresholds only judge files a test
// happened to import, so this also fails on any src file missing from the report.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LCOV = join(ROOT, "coverage", "lcov.info");

const SOURCE = /\.[cm]?js$/;
const listJs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? listJs(join(dir, e.name)) : SOURCE.test(e.name) ? [join(dir, e.name)] : []);

function runTests() {
  rmSync(LCOV, { force: true }); // never judge a stale report from an earlier run
  mkdirSync(join(ROOT, "coverage"), { recursive: true });
  const tests = listJs(join(ROOT, "tests")).filter((f) => f.endsWith(".test.js"));
  const args = [
    "--test", "--experimental-test-coverage",
    "--test-coverage-exclude=tests/**", "--test-coverage-exclude=scripts/**",
    "--test-reporter=spec", "--test-reporter-destination=stdout",
    "--test-reporter=lcov", `--test-reporter-destination=${LCOV}`,
    ...tests,
  ];
  return spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" }).status;
}

// Parses lcov into { absolutePath: { LF, LH, BRF, BRH, FNF, FNH } }.
function parseLcov(text) {
  const files = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const [key, value] = line.split(/:(.*)/s);
    if (key === "SF") files[resolve(ROOT, value)] = current = {};
    else if (current && ["LF", "LH", "BRF", "BRH", "FNF", "FNH"].includes(key)) current[key] = Number(value);
  }
  return files;
}

// node:coverage comments would hide code from the coverage report. A Stryker
// disable comment is allowed only for one line, named mutators and a reason, so
// every equivalent mutant is visible and justified in review.
const STRYKER_OK = /Stryker disable next-line [A-Za-z]+(,[A-Za-z]+)*: \S.{9,}/;
function ignoreCommentProblems(name, text) {
  return text.split(/\r?\n/).flatMap((line, i) => {
    if (line.includes("node:coverage")) return [`${name}:${i + 1}: uses a node:coverage comment`];
    if (/Stryker\s+(disable|restore)/.test(line) && !STRYKER_OK.test(line)) {
      return [`${name}:${i + 1}: Stryker comments must be "Stryker disable next-line <Mutator>: <reason>"`];
    }
    return [];
  });
}

function gaps(report) {
  const problems = [];
  for (const file of listJs(join(ROOT, "src"))) {
    const name = relative(ROOT, file);
    problems.push(...ignoreCommentProblems(name, readFileSync(file, "utf8")));
    const c = report[resolve(file)];
    if (!c) { problems.push(`${name}: never loaded by any test`); continue; }
    for (const [kind, found, hit] of [["lines", "LF", "LH"], ["branches", "BRF", "BRH"], ["functions", "FNF", "FNH"]]) {
      if (c[hit] !== c[found]) problems.push(`${name}: ${kind} ${c[hit]}/${c[found]}`);
    }
  }
  return problems;
}

if (runTests() !== 0) {
  console.error("\nCoverage gate: tests failed.");
  process.exit(1);
}
let lcov;
try { lcov = readFileSync(LCOV, "utf8"); } catch {
  console.error(`\nCoverage gate: no coverage report was written to ${LCOV}.`);
  process.exit(1);
}
const problems = gaps(parseLcov(lcov));
if (problems.length) {
  console.error(`\nCoverage gate FAILED: src/ must be 100% covered.\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nCoverage gate passed: every file in src/ is 100% covered (lines, branches, functions).");

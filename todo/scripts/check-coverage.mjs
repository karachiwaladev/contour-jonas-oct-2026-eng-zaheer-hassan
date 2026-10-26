// Coverage gate, the first half of `npm run eval`: every file under src/ must
// have 100% line, branch and function coverage from the unit tests. Node's own
// thresholds only judge files a test happened to import, so this also fails on
// any src file missing from the report. It also enforces the eval's anti-cheat
// rules (scripts/eval-policy.mjs) on src/ comments, stryker.config.mjs and the
// npm scripts, so neither gate can be quietly weakened.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ignoreCommentProblems, strykerConfigProblems, scriptProblems } from "./eval-policy.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const LCOV = join(ROOT, "coverage", "lcov.info");

const SOURCE = /\.[cm]?js$/;
const listJs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? listJs(join(dir, e.name)) : SOURCE.test(e.name) ? [join(dir, e.name)] : []);

async function policyProblems() {
  const { default: stryker } = await import(pathToFileURL(join(ROOT, "stryker.config.mjs")));
  const { scripts = {} } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const comments = listJs(join(ROOT, "src"))
    .flatMap((file) => ignoreCommentProblems(relative(ROOT, file), readFileSync(file, "utf8")));
  return [...comments, ...strykerConfigProblems(stryker), ...scriptProblems(scripts)];
}

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

function coverageProblems(report) {
  const problems = [];
  for (const file of listJs(join(ROOT, "src"))) {
    const name = relative(ROOT, file);
    const c = report[resolve(file)];
    if (!c) { problems.push(`${name}: never loaded by any test`); continue; }
    for (const [kind, found, hit] of [["lines", "LF", "LH"], ["branches", "BRF", "BRH"], ["functions", "FNF", "FNH"]]) {
      if (c[hit] !== c[found]) problems.push(`${name}: ${kind} ${c[hit]}/${c[found]}`);
    }
  }
  return problems;
}

function fail(title, problems) {
  console.error(`\n${title}\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

const policy = await policyProblems();
if (policy.length) fail("Eval policy FAILED: an exclusion or setting would weaken the gates.", policy);
if (runTests() !== 0) fail("Coverage gate FAILED:", ["tests failed"]);
let lcov;
try { lcov = readFileSync(LCOV, "utf8"); } catch { fail("Coverage gate FAILED:", [`no report was written to ${LCOV}`]); }
const gaps = coverageProblems(parseLcov(lcov));
if (gaps.length) fail("Coverage gate FAILED: src/ must be 100% covered.", gaps);
console.log("\nCoverage gate passed: every file in src/ is 100% covered (lines, branches, functions).");

// Coverage gate: every file under src/ must have 100% line, branch and function
// coverage from the unit tests. Node's own thresholds only judge files a test
// happened to import, so this also fails on any src file missing from the report.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LCOV = join(ROOT, "coverage", "lcov.info");

const listJs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? listJs(join(dir, e.name)) : e.name.endsWith(".js") ? [join(dir, e.name)] : []);

function runTests() {
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

function gaps(report) {
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

if (runTests() !== 0) {
  console.error("\nCoverage gate: tests failed.");
  process.exit(1);
}
const problems = gaps(parseLcov(readFileSync(LCOV, "utf8")));
if (problems.length) {
  console.error(`\nCoverage gate FAILED: src/ must be 100% covered.\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nCoverage gate passed: every file in src/ is 100% covered (lines, branches, functions).");

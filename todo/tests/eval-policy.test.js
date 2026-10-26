// The eval's anti-cheat rules (scripts/eval-policy.mjs): what may be excluded
// from coverage or mutation testing, and how Stryker must be configured.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ignoreCommentProblems, strykerConfigProblems, scriptProblems } from "../scripts/eval-policy.mjs";

const ok = "// Stryker disable next-line StringLiteral: refresh() resets the tag anyway";
const problems = (line) => ignoreCommentProblems("src/x.js", `const a = 1;\n${line}\nconst b = 2;`);

test("comments: a justified one-line exclusion of named mutators is allowed", () => {
  assert.deepEqual(problems(ok), []);
  assert.deepEqual(problems("  // Stryker disable next-line StringLiteral,BooleanLiteral: both are equivalent here"), []);
});

test("comments: everything else that mentions Stryker is rejected, with its line number", () => {
  for (const line of [
    "// Stryker disable all",
    "/* Stryker disable all */",
    "// Stryker disable next-line StringLiteral",
    "// Stryker disable next-line StringLiteral: short",
    "// Stryker disable next-line all: these are all equivalent, trust me",
    "// Stryker disable next-line StringLiteral,all: these are all equivalent, trust me",
    "// Stryker disable StringLiteral: file-wide until restored, which is too broad",
    "// Stryker restore all",
    `/* Stryker disable all */ ${ok}`,
    `const x = 1; ${ok}`,
  ]) {
    const found = problems(line);
    assert.equal(found.length, 1, line);
    assert.match(found[0], /^src\/x\.js:2: /, line);
  }
});

test("comments: node:coverage ignore comments are rejected", () => {
  assert.equal(problems("/* node:coverage disable */").length, 1);
});

const goodConfig = {
  testRunner: "tap", tap: { testFiles: ["tests/*.test.js"] }, mutate: ["src/**/*.js"],
  coverageAnalysis: "perTest", reporters: ["clear-text"], thresholds: { high: 100, low: 100, break: 100 },
};

test("stryker config: the committed shape passes", () => {
  assert.deepEqual(strykerConfigProblems(goodConfig), []);
});

test("stryker config: lowering the bar or excluding code is rejected", () => {
  const cases = {
    "lower break threshold": { thresholds: { break: 90 } },
    "no break threshold": { thresholds: { high: 100 } },
    "file excluded from mutate": { mutate: ["src/**/*.js", "!src/state.js"] },
    "excluded mutators": { mutator: { excludedMutations: ["StringLiteral"] } },
    "ignorers": { ignorers: ["console"] },
    "ignore static": { ignoreStatic: true },
    "incremental reuse": { incremental: true },
    "dry run only": { dryRunOnly: true },
    "fewer test files": { tap: { testFiles: ["tests/tasks.test.js"] } },
  };
  for (const [name, change] of Object.entries(cases)) {
    assert.ok(strykerConfigProblems({ ...goodConfig, ...change }).length > 0, name);
  }
});

const goodScripts = {
  test: "node --test",
  "test:coverage": "node scripts/check-coverage.mjs",
  "test:mutation": "stryker run",
  eval: "npm run test:coverage && npm run test:mutation",
};

test("npm scripts: the eval must run both gates for real", () => {
  assert.deepEqual(scriptProblems(goodScripts), []);
  assert.ok(scriptProblems({ ...goodScripts, "test:mutation": "echo skipped" }).length > 0);
  assert.ok(scriptProblems({ ...goodScripts, eval: "npm run test:coverage" }).length > 0);
  assert.ok(scriptProblems({ ...goodScripts, eval: "npm run test:coverage || npm run test:mutation" }).length > 0);
});

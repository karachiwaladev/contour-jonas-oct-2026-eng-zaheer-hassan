// Mutation testing: Stryker changes src/ one small edit at a time (flip an
// operator, empty a block, swap a string...) and reruns the unit tests. A test
// suite that still passes on a mutant is missing an assertion. The eval fails
// unless every mutant is killed. A mutant that genuinely cannot change behaviour
// is excluded in the source with a `// Stryker disable next-line <mutator>: <why>`
// comment, so every exception is visible in review.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "tap",
  tap: {
    testFiles: ["tests/*.test.js"],
  },
  mutate: ["src/**/*.js"],
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "progress", "html", "json"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  htmlReporter: { fileName: "reports/mutation/index.html" },
  thresholds: { high: 100, low: 100, break: 100 },
  tempDirName: ".stryker-tmp",
  cleanTempDir: "always",
};

// domain/search.js: the search box's matching rule (#21).
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesQuery } from "../src/domain/search.js";

const task = (title, tags = []) => ({ title, tags });
const rent = task("Pay Rent", ["home", "bills"]);

test("matchesQuery: an empty or whitespace-only query matches every task", () => {
  for (const q of ["", "   "]) {
    assert.equal(matchesQuery(rent, q), true);
    assert.equal(matchesQuery(task("x"), q), true);
  }
});

test("matchesQuery: a word contained in the title matches", () => {
  assert.equal(matchesQuery(rent, "ren"), true);
});

test("matchesQuery: a word contained in any tag matches", () => {
  assert.equal(matchesQuery(rent, "bill"), true);
});

test("matchesQuery: ignores case in both the query and the task", () => {
  assert.equal(matchesQuery(rent, "PAY"), true);
  assert.equal(matchesQuery(task("pay rent", ["Home"]), "Rent hOME"), true);
});

test("matchesQuery: leading and trailing spaces are ignored", () => {
  assert.equal(matchesQuery(rent, "  rent  "), true);
});

test("matchesQuery: every word must appear, in any order, title and tags mixed", () => {
  assert.equal(matchesQuery(rent, "home pay"), true);
  assert.equal(matchesQuery(rent, "rent xyz"), false);
  assert.equal(matchesQuery(rent, "xyz rent"), false);
});

test("matchesQuery: no match is false, even when each letter appears", () => {
  assert.equal(matchesQuery(task("Passport"), "tap"), false);
  assert.equal(matchesQuery(rent, "groceries"), false);
});

test("matchesQuery: a stored task with no title never throws, and never matches 'undefined'", () => {
  const untitled = { tags: ["home"] };
  assert.equal(matchesQuery(untitled, ""), true);
  assert.equal(matchesQuery(untitled, "home"), true);
  assert.equal(matchesQuery(untitled, "undefined"), false);
});

test("matchesQuery: words split on any whitespace (tab, non-breaking space)", () => {
  assert.equal(matchesQuery(rent, "pay\trent"), true);
  assert.equal(matchesQuery(rent, "pay\u00a0rent"), true);
});

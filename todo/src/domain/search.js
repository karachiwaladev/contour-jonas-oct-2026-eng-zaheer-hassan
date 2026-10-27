// Search (#21): does a task match the search box text? Pure.
// Every whitespace-separated word must appear (case-insensitively) in the title
// or in some tag. Repeated or edge whitespace gives empty words, which match
// anything, so an empty or whitespace-only query matches every task.
// A legacy record may lack a title; treat it as "" so one bad row can't break
// rendering for the whole list.
export function matchesQuery(task, query) {
  const fields = [task.title ?? "", ...task.tags].map((s) => s.toLowerCase());
  return query.toLowerCase().split(/\s/).every((word) => fields.some((f) => f.includes(word)));
}

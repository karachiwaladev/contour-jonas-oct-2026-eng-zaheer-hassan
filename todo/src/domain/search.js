// Search (#21): does a task match the search box text? Pure.
// Every space-separated word must appear (case-insensitively) in the title or
// in some tag. Extra spaces give empty words, which match anything, so an empty
// or whitespace-only query matches every task.
export function matchesQuery(task, query) {
  const fields = [task.title, ...task.tags].map((s) => s.toLowerCase());
  return query.toLowerCase().split(" ").every((word) => fields.some((f) => f.includes(word)));
}

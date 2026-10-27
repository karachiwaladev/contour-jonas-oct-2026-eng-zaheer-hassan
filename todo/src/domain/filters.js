// Pure list views: counts, tag catalogue and status/tag/priority/search filtering.
import { PRIORITIES } from "../config.js";
import { matchesQuery } from "./search.js";

export function countByStatus(tasks) {
  const counts = { all: tasks.length, active: 0, hold: 0, done: 0 };
  for (const t of tasks) counts[t.status]++;
  return counts;
}

// Allow-listed, so a stray value never adds (or bumps) a key like "all".
export function countByPriority(tasks) {
  const counts = { all: tasks.length, ...Object.fromEntries(PRIORITIES.map((p) => [p, 0])) };
  for (const t of tasks) if (PRIORITIES.includes(t.priority)) counts[t.priority]++;
  return counts;
}

export function allTags(tasks) {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort();
}

// view = { status: "all" | <status>, tag: "" | <tag>, priority: "all" | <priority>, query: <search text> }
export function filterTasks(tasks, view) {
  return tasks.filter((t) =>
    (view.status === "all" || t.status === view.status) && (!view.tag || t.tags.includes(view.tag))
    && (view.priority === "all" || t.priority === view.priority) && matchesQuery(t, view.query));
}

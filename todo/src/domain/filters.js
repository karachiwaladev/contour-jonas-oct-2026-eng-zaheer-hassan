// Pure list views: counts, tag catalogue and status/tag filtering.

export function countByStatus(tasks) {
  const counts = { all: tasks.length, active: 0, hold: 0, done: 0 };
  for (const t of tasks) counts[t.status]++;
  return counts;
}

export function allTags(tasks) {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort();
}

// view = { status: "all" | "active" | "hold" | "done", tag: "" | <tag> }
export function filterTasks(tasks, view) {
  return tasks.filter((t) =>
    (view.status === "all" || t.status === view.status) && (!view.tag || t.tags.includes(view.tag)));
}

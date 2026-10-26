// Pure task rules: shape normalisation and input parsing.

// Tasks saved before statuses / due dates / tags existed only have `done`.
export function normalize(task) {
  return {
    ...task,
    status: task.status || (task.done ? "done" : "active"),
    due: task.due || "",
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

// "Work, URGENT, work" -> ["work", "urgent"]
export function parseTags(text) {
  return [...new Set(text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

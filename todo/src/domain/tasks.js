// Pure task rules: shape normalisation and input parsing.

// Tasks saved before statuses / due dates / tags existed only have `done`.
export function normalize(task) {
  return {
    ...task,
    status: task.status || (task.done ? "done" : "active"),
    due: task.due || "",
    tags: Array.isArray(task.tags) ? task.tags : [],
    repeat: task.repeat || "none",
  };
}

// "Work, URGENT, work" -> ["work", "urgent"]
export function parseTags(text) {
  return [...new Set(text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

// Builds the stored shape of a task from form input. A repeating task needs a
// date to repeat from, so one without a due date starts today.
export function prepareNewTask({ title, due, tags, repeat }, todayIso) {
  const repeats = repeat && repeat !== "none";
  return { title, status: "active", due: due || (repeats ? todayIso : ""), tags, repeat: repeat || "none" };
}

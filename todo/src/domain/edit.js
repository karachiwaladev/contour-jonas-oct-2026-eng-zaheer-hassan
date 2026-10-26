// Pure rule for the inline edit form: which fields a user may change.
// Status, repeat, id, nextId and createdAt stay as stored.
import { parseTags, normalizePriority } from "./tasks.js";
import { fromIso } from "./dates.js";

// A repeating task needs a date to repeat from (see prepareNewTask), so a
// cleared due date keeps the stored one; a one-off task may drop it.
function editedDue(task, due) {
  return due || (task.repeat === "none" ? "" : task.due);
}

// input = { title, priority, due, tags: "comma, separated" }.
// Returns the edited task, or null when the title is blank.
export function applyEdit(task, { title, priority, due, tags }) {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const edited = { ...task, title: trimmed, priority: normalizePriority(priority), due: editedDue(task, due), tags: parseTags(tags) };
  // Moving a monthly task re-anchors it on the new day of the month.
  if (task.repeat === "monthly" && edited.due !== task.due) edited.repeatDay = fromIso(edited.due).getDate();
  return edited;
}

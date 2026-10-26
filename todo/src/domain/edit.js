// Pure rule for the inline edit form: which fields a user may change.
// Status, repeat (and its anchor day / next link), id and createdAt stay as stored.
import { parseTags, normalizePriority } from "./tasks.js";

// input = { title, priority, due, tags: "comma, separated" }.
// Returns the edited task, or null when the title is blank.
export function applyEdit(task, { title, priority, due, tags }) {
  const trimmed = title.trim();
  if (!trimmed) return null;
  return { ...task, title: trimmed, priority: normalizePriority(priority), due, tags: parseTags(tags) };
}

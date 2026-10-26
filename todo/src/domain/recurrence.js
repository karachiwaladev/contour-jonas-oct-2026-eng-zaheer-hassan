// Recurring tasks: when the next occurrence is due, and what completing or
// un-completing one does.
import { addDays, fromIso, toIso } from "./dates.js";

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

// Next month on the anchor day, clamped to that month's last day. Clamping
// never moves the anchor: Jan 31 -> Feb 28 -> Mar 31.
function addMonth(iso, anchorDay) {
  const d = fromIso(iso);
  const year = d.getFullYear() + (d.getMonth() === 11 ? 1 : 0);
  const month = (d.getMonth() + 1) % 12;
  return toIso(new Date(year, month, Math.min(anchorDay, daysInMonth(year, month))));
}

const STEP = {
  daily: (iso) => addDays(iso, 1),
  weekly: (iso) => addDays(iso, 7),
  monthly: addMonth,
};

// Own-property check, so stored junk like "constructor" never counts as a repeat.
const isRepeating = (repeat) => typeof repeat === "string" && Object.hasOwn(STEP, repeat);

// The first occurrence strictly after today, stepping from the current due date,
// so completing late skips the missed occurrences instead of replaying them.
// anchorDay (monthly only) defaults to the due date's day of the month.
export function nextDueDate(due, repeat, todayIso, anchorDay) {
  const start = due || todayIso;
  const anchor = anchorDay || fromIso(start).getDate();
  const step = STEP[repeat];
  let next = step(start, anchor);
  while (next <= todayIso) next = step(next, anchor);
  return next;
}

// Returns { completed, next }: the task marked done, plus the new occurrence to
// create for a repeating task (null for a one-off).
export function completeTask(task, todayIso) {
  const completed = { ...task, status: "done" };
  if (!isRepeating(task.repeat)) return { completed, next: null };
  const repeatDay = task.repeatDay || fromIso(task.due || todayIso).getDate();
  const next = {
    title: task.title,
    status: "active",
    due: nextDueDate(task.due, task.repeat, todayIso, repeatDay),
    tags: task.tags,
    repeat: task.repeat,
  };
  if (task.repeat === "monthly") next.repeatDay = repeatDay;
  return { completed, next };
}

// Undo of completeTask: the task becomes active again, and the occurrence it
// spawned is removed, but only if it is still untouched (active), so a copy
// the user already completed or put on hold is never lost.
export function uncompleteTask(task, tasks) {
  const { nextId, ...rest } = task;
  // Stored tasks always have an id, so a missing nextId simply finds nothing.
  const spawned = tasks.find((t) => t.id === nextId);
  return { revived: { ...rest, status: "active" }, removeId: spawned && spawned.status === "active" ? spawned.id : null };
}

export function stopRepeating(task) {
  return { ...task, repeat: "none" };
}

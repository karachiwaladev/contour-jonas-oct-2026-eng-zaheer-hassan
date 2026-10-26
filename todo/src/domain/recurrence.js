// Recurring tasks: when the next occurrence is due, and what completing one does.
import { addDays, fromIso, toIso } from "./dates.js";

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

// Same day next month, clamped to the month's last day (Jan 31 -> Feb 28).
// Known limitation: the series then continues from the clamped day (Feb 28 -> Mar 28).
function addMonth(iso) {
  const d = fromIso(iso);
  const year = d.getFullYear() + (d.getMonth() === 11 ? 1 : 0);
  const month = (d.getMonth() + 1) % 12;
  return toIso(new Date(year, month, Math.min(d.getDate(), daysInMonth(year, month))));
}

const STEP = {
  daily: (iso) => addDays(iso, 1),
  weekly: (iso) => addDays(iso, 7),
  monthly: addMonth,
};

// The first occurrence strictly after today, stepping from the current due date,
// so completing late skips the missed occurrences instead of replaying them.
export function nextDueDate(due, repeat, todayIso) {
  const step = STEP[repeat];
  let next = step(due || todayIso);
  while (next <= todayIso) next = step(next);
  return next;
}

// Returns { completed, next }: the task marked done, plus the new occurrence to
// create for a repeating task (null for a one-off).
export function completeTask(task, todayIso) {
  const completed = { ...task, status: "done" };
  if (!STEP[task.repeat]) return { completed, next: null };
  const next = {
    title: task.title,
    status: "active",
    due: nextDueDate(task.due, task.repeat, todayIso),
    tags: task.tags,
    repeat: task.repeat,
  };
  return { completed, next };
}

export function stopRepeating(task) {
  return { ...task, repeat: "none" };
}

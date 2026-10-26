// Pure date helpers. Dates are local calendar days as "YYYY-MM-DD" strings,
// matching <input type="date">. Arithmetic uses local Date components, never
// `new Date("YYYY-MM-DD")`, which parses as UTC and can shift a day.
import { DUE_SOON_DAYS } from "../config.js";

const pad = (n) => String(n).padStart(2, "0");

export function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(now = new Date()) {
  return toIso(now);
}

export function addDays(iso, days) {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

// "overdue" | "soon" | "later" | "" (no due date, or completed).
export function dueState(task, todayIso = today()) {
  if (!task.due || task.status === "done") return "";
  if (task.due < todayIso) return "overdue";
  if (task.due <= addDays(todayIso, DUE_SOON_DAYS)) return "soon";
  return "later";
}

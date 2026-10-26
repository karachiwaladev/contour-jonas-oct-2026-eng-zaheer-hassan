// Renders one task <li> from the #task-template markup.
import { dueState } from "../domain/dates.js";
import { createChip } from "./chip.js";

const DUE_PREFIX = { overdue: "Overdue · ", soon: "Due soon · " };
const REPEAT_LABEL = { daily: "⟳ Daily", weekly: "⟳ Weekly", monthly: "⟳ Monthly" };

export function formatDue(due) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fillDue(li, task, today) {
  const due = li.querySelector(".task-due");
  if (!task.due) return due.remove();
  const state = dueState(task, today);
  due.textContent = (DUE_PREFIX[state] || "Due ") + formatDue(task.due);
  due.dataset.state = state;
  if (state === "overdue" || state === "soon") li.classList.add(`due-${state}`);
}

// Label + "stop repeating" button. The button is hidden once the task is done:
// its next occurrence already exists, so stop that one instead.
function fillRepeat(li, task) {
  const label = li.querySelector(".task-repeat-label");
  const stop = li.querySelector(".task-repeat");
  const repeats = Boolean(REPEAT_LABEL[task.repeat]);
  if (repeats) label.textContent = REPEAT_LABEL[task.repeat];
  else label.remove();
  stop.hidden = !repeats || task.status === "done";
}

function fillControls(li, task) {
  li.querySelector(".task-done").checked = task.status === "done";
  const hold = li.querySelector(".task-hold");
  hold.setAttribute("aria-pressed", String(task.status === "hold"));
  hold.title = task.status === "hold" ? "Resume" : "Put on hold";
  hold.hidden = task.status === "done";
  li.querySelector(".task-delete").setAttribute("aria-label", `Delete "${task.title}"`);
}

export function renderTaskItem(template, task, { activeTag, today }) {
  const li = template.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
  li.dataset.status = task.status;
  li.querySelector(".task-title").textContent = task.title;
  fillControls(li, task);
  fillRepeat(li, task);
  fillDue(li, task, today);
  li.querySelector(".task-tags").append(...task.tags.map((tag) => createChip(tag, activeTag)));
  return li;
}

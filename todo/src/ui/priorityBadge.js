// The coloured priority badge on a task row; CSS colours it by data-priority.
import { DEFAULT_PRIORITY } from "../config.js";

const LABEL = { high: "High", medium: "Medium", low: "Low" };

export function fillPriorityBadge(el, priority) {
  const known = Object.hasOwn(LABEL, priority) ? priority : DEFAULT_PRIORITY;
  el.textContent = LABEL[known];
  el.dataset.priority = known;
  el.title = `${LABEL[known]} priority`;
}

// The task list: rendering plus one delegated listener per action.
import { renderTaskItem } from "./taskItem.js";

const taskId = (el) => Number(el.closest(".task").dataset.id);

// The query goes in via textContent only, never as HTML.
function emptyMessage(total, query) {
  if (!total) return "No tasks yet. Add one above.";
  const q = query.trim();
  return q ? `No tasks match "${q}".` : "No tasks match this filter.";
}

// opts = { activeTag, today, query }
export function renderTaskList({ list, empty, template }, shown, total, opts) {
  list.replaceChildren(...shown.map((task) => renderTaskItem(template, task, opts)));
  empty.hidden = shown.length > 0;
  empty.textContent = emptyMessage(total, opts.query);
}

// handlers = { onDone(id, checked), onHold(id), onStopRepeat(id), onDelete(id) }
export function bindTaskList(list, handlers) {
  list.addEventListener("change", (e) => {
    if (e.target.matches(".task-done")) handlers.onDone(taskId(e.target), e.target.checked);
  });
  list.addEventListener("click", (e) => {
    if (e.target.matches(".task-hold")) handlers.onHold(taskId(e.target));
    else if (e.target.matches(".task-repeat")) handlers.onStopRepeat(taskId(e.target));
    else if (e.target.matches(".task-delete")) handlers.onDelete(taskId(e.target));
  });
}

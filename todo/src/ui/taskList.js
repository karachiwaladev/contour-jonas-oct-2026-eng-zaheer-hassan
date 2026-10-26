// The task list: rendering plus one delegated listener per action.
import { renderTaskItem } from "./taskItem.js";

const taskId = (el) => Number(el.closest(".task").dataset.id);

export function renderTaskList({ list, empty, template }, shown, total, opts) {
  list.replaceChildren(...shown.map((task) => renderTaskItem(template, task, opts)));
  empty.hidden = shown.length > 0;
  empty.textContent = total ? "No tasks match this filter." : "No tasks yet. Add one above.";
}

// handlers = { onDone(id, checked), onHold(id), onDelete(id) }
export function bindTaskList(list, handlers) {
  list.addEventListener("change", (e) => {
    if (e.target.matches(".task-done")) handlers.onDone(taskId(e.target), e.target.checked);
  });
  list.addEventListener("click", (e) => {
    if (e.target.matches(".task-hold")) handlers.onHold(taskId(e.target));
    else if (e.target.matches(".task-delete")) handlers.onDelete(taskId(e.target));
  });
}

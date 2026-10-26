// Inline edit form for a task row: Edit swaps the row's content for a form
// cloned from #edit-template. Saving re-renders the list (closing the form);
// a rejected save leaves it open. Validation is domain logic (applyEdit).
const taskId = (el) => Number(el.closest(".task").dataset.id);

function openEditForm(li, template, task) {
  const form = template.content.firstElementChild.cloneNode(true);
  const field = (name) => form.elements.namedItem(name);
  field("title").value = task.title;
  field("priority").value = task.priority;
  field("due").value = task.due;
  field("tags").value = task.tags.join(", ");
  li.replaceChildren(form);
  field("title").focus();
}

function readForm(form) {
  const value = (name) => form.elements.namedItem(name).value;
  return { title: value("title"), priority: value("priority"), due: value("due"), tags: value("tags") };
}

// handlers = { getTask(id), onSave(id, input), onCancel() }
export function bindEditing(list, template, handlers) {
  list.addEventListener("click", (e) => {
    if (e.target.matches(".task-edit")) openEditForm(e.target.closest(".task"), template, handlers.getTask(taskId(e.target)));
    else if (e.target.matches(".edit-cancel")) handlers.onCancel();
  });
  list.addEventListener("submit", async (e) => {
    if (!e.target.matches(".edit-form")) return;
    e.preventDefault();
    await handlers.onSave(taskId(e.target), readForm(e.target));
    e.target.elements.namedItem("title").focus();
  });
}

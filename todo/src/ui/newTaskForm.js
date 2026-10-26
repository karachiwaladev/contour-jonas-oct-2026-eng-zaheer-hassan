// The "add task" form: reads and validates input, hands a new task to onSubmit.
import { parseTags } from "../domain/tasks.js";

export function bindNewTaskForm(form, onSubmit) {
  const field = (name) => form.elements.namedItem(name);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = field("title").value.trim();
    if (!title) return;
    await onSubmit({ title, status: "active", due: field("due").value, tags: parseTags(field("tags").value) });
    form.reset();
    field("title").focus();
  });
}

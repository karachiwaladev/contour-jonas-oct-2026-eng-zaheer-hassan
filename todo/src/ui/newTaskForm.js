// The "add task" form: reads and validates input, hands it to onSubmit.
// Shaping it into a stored task (defaults, due date for repeats) is domain logic.
import { parseTags } from "../domain/tasks.js";

export function bindNewTaskForm(form, onSubmit) {
  const field = (name) => form.elements.namedItem(name);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = field("title").value.trim();
    if (!title) return;
    await onSubmit({
      title,
      due: field("due").value,
      tags: parseTags(field("tags").value),
      repeat: field("repeat").value,
      priority: field("priority").value,
    });
    form.reset();
    field("title").focus();
  });
}

// Wiring: connects storage, state and UI for a document. No business rules live
// here. Takes the document as a parameter so tests can run it against a fake.
import { openDb } from "./storage/db.js";
import { createTaskRepo } from "./storage/taskRepo.js";
import { createState } from "./state.js";
import { today } from "./domain/dates.js";
import { countByStatus, countByPriority, allTags, filterTasks } from "./domain/filters.js";
import { renderTaskList, bindTaskList } from "./ui/taskList.js";
import { renderFilterBar, bindFilterBar } from "./ui/filterBar.js";
import { renderPriorityFilter, bindPriorityFilter } from "./ui/priorityFilter.js";
import { renderTagRow, bindTagClicks } from "./ui/tagRow.js";
import { bindNewTaskForm } from "./ui/newTaskForm.js";
import { bindEditing } from "./ui/editForm.js";

function findElements(doc) {
  const $ = (id) => doc.getElementById(id);
  return {
    form: $("new-task"), list: $("task-list"), empty: $("empty"), summary: $("summary"),
    tagRow: $("tag-filter"), template: $("task-template"), editTemplate: $("edit-template"),
    filterButtons: [...doc.querySelectorAll(".filter")],
    priorityButtons: [...doc.querySelectorAll(".priority-filter")],
  };
}

function render(els, { tasks, view }) {
  const counts = countByStatus(tasks);
  renderFilterBar(els.filterButtons, counts, view.status);
  renderPriorityFilter(els.priorityButtons, countByPriority(tasks), view.priority);
  renderTagRow(els.tagRow, allTags(tasks), view.tag);
  renderTaskList(els, filterTasks(tasks, view), tasks.length, { activeTag: view.tag, today: today() });
  els.summary.textContent = tasks.length
    ? `${counts.active} active · ${counts.hold} on hold · ${counts.done} completed` : "";
}

async function wire(doc, els) {
  const state = createState(createTaskRepo(await openDb()));
  state.subscribe((s) => render(els, s));
  bindNewTaskForm(els.form, state.addTask);
  bindFilterBar(els.filterButtons, state.setStatusFilter);
  bindPriorityFilter(els.priorityButtons, state.setPriorityFilter);
  bindTagClicks(doc, { onTag: state.toggleTag, onClear: state.clearTag });
  bindTaskList(els.list, {
    onDone: state.setDone, onHold: state.toggleHold, onStopRepeat: state.stopRepeating, onDelete: state.removeTask,
  });
  bindEditing(els.list, els.editTemplate, {
    getTask: (id) => state.get().tasks.find((t) => t.id === id),
    onSave: state.editTask,
    onCancel: state.load, // re-render, which drops the open form
  });
  await state.load();
}

// Resolves once the first render is done, or after showing why the app couldn't start.
export function startApp(doc) {
  const els = findElements(doc);
  return wire(doc, els).catch((err) => {
    els.summary.textContent = `Could not open the local database: ${err.message}`;
  });
}

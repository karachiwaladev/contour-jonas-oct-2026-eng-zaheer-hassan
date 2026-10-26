// Wiring: connects storage, state and UI for a document. No business rules live
// here. Takes the document as a parameter so tests can run it against a fake.
import { openDb } from "./storage/db.js";
import { createTaskRepo } from "./storage/taskRepo.js";
import { createState } from "./state.js";
import { today } from "./domain/dates.js";
import { countByStatus, allTags, filterTasks } from "./domain/filters.js";
import { renderTaskList, bindTaskList } from "./ui/taskList.js";
import { renderFilterBar, bindFilterBar } from "./ui/filterBar.js";
import { renderTagRow, bindTagClicks } from "./ui/tagRow.js";
import { bindNewTaskForm } from "./ui/newTaskForm.js";

function findElements(doc) {
  const $ = (id) => doc.getElementById(id);
  return {
    form: $("new-task"), list: $("task-list"), empty: $("empty"), summary: $("summary"),
    tagRow: $("tag-filter"), template: $("task-template"),
    filterButtons: [...doc.querySelectorAll(".filter")],
  };
}

function render(els, { tasks, view }) {
  const counts = countByStatus(tasks);
  renderFilterBar(els.filterButtons, counts, view.status);
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
  bindTagClicks(doc, { onTag: state.toggleTag, onClear: state.clearTag });
  bindTaskList(els.list, {
    onDone: state.setDone, onHold: state.toggleHold, onStopRepeat: state.stopRepeating, onDelete: state.removeTask,
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

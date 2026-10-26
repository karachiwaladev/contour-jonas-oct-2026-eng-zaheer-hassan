// Entry point: connects storage, state and UI. No business rules live here.
import { openDb } from "./storage/db.js";
import { createTaskRepo } from "./storage/taskRepo.js";
import { createState } from "./state.js";
import { today } from "./domain/dates.js";
import { countByStatus, allTags, filterTasks } from "./domain/filters.js";
import { renderTaskList, bindTaskList } from "./ui/taskList.js";
import { renderFilterBar, bindFilterBar } from "./ui/filterBar.js";
import { renderTagRow, bindTagClicks } from "./ui/tagRow.js";
import { bindNewTaskForm } from "./ui/newTaskForm.js";

const $ = (id) => document.getElementById(id);
const els = {
  form: $("new-task"), list: $("task-list"), empty: $("empty"), summary: $("summary"),
  tagRow: $("tag-filter"), template: $("task-template"),
  filterButtons: [...document.querySelectorAll(".filter")],
};

function render({ tasks, view }) {
  const counts = countByStatus(tasks);
  renderFilterBar(els.filterButtons, counts, view.status);
  renderTagRow(els.tagRow, allTags(tasks), view.tag);
  renderTaskList(els, filterTasks(tasks, view), tasks.length, { activeTag: view.tag, today: today() });
  els.summary.textContent = tasks.length
    ? `${counts.active} active · ${counts.hold} on hold · ${counts.done} completed` : "";
}

async function main() {
  const state = createState(createTaskRepo(await openDb()));
  state.subscribe(render);
  bindNewTaskForm(els.form, state.addTask);
  bindFilterBar(els.filterButtons, state.setStatusFilter);
  bindTagClicks(document, { onTag: state.toggleTag, onClear: state.clearTag });
  bindTaskList(els.list, { onDone: state.setDone, onHold: state.toggleHold, onDelete: state.removeTask });
  await state.load();
}

main().catch((err) => {
  els.summary.textContent = `Could not open the local database: ${err.message}`;
});

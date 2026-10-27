// Footer text: how many tasks are still open (active or on hold) and how many
// are done. Always counts the whole list, never the filtered view.
const OPEN = ["active", "hold"];

export function footerText(tasks) {
  if (tasks.length === 0) return "";
  const open = tasks.filter((t) => OPEN.includes(t.status)).length;
  const done = tasks.filter((t) => t.status === "done").length;
  return `${open} open · ${done} done`;
}

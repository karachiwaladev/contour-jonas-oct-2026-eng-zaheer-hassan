// Priority filter buttons (Any / High / Medium / Low) with live counts.
export function renderPriorityFilter(buttons, counts, activePriority) {
  for (const btn of buttons) {
    const priority = btn.dataset.priority;
    btn.setAttribute("aria-pressed", String(activePriority === priority));
    btn.querySelector(".count").textContent = counts[priority];
  }
}

export function bindPriorityFilter(buttons, onSelect) {
  for (const btn of buttons) btn.addEventListener("click", () => onSelect(btn.dataset.priority));
}

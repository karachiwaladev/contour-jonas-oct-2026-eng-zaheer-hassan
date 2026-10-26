// Status filter buttons (All / Active / On hold / Completed) with live counts.
export function renderFilterBar(buttons, counts, activeStatus) {
  for (const btn of buttons) {
    const status = btn.dataset.status;
    btn.setAttribute("aria-pressed", String(activeStatus === status));
    btn.querySelector(".count").textContent = counts[status];
  }
}

export function bindFilterBar(buttons, onSelect) {
  for (const btn of buttons) btn.addEventListener("click", () => onSelect(btn.dataset.status));
}

// Row of every tag in use, plus a "clear" chip while a tag filter is active.
// Tag chips anywhere on the page (row or task) toggle the tag filter.
import { createChip } from "./chip.js";

export function renderTagRow(container, tags, activeTag) {
  container.hidden = tags.length === 0;
  const chips = tags.map((tag) => createChip(tag, activeTag));
  if (activeTag) {
    const clear = Object.assign(document.createElement("button"), {
      type: "button", className: "chip chip-clear", textContent: "✕ clear tag",
    });
    chips.push(clear);
  }
  container.replaceChildren(...chips);
}

// handlers = { onTag(tag), onClear() }
export function bindTagClicks(root, handlers) {
  root.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    e.preventDefault();
    if (chip.classList.contains("chip-clear")) handlers.onClear();
    else handlers.onTag(chip.dataset.tag);
  });
}

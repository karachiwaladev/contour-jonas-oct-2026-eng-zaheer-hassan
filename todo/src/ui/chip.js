// A clickable #tag chip, used both on tasks and in the tag row.
export function createChip(tag, activeTag) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.tag = tag;
  chip.textContent = `#${tag}`;
  chip.setAttribute("aria-pressed", String(activeTag === tag));
  return chip;
}

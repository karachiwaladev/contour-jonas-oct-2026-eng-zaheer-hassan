// The list footer ("N open · N done"). Hidden when there is nothing to say.
export function renderFooter(el, text) {
  el.textContent = text;
  el.hidden = text === "";
}

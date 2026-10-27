// The search box (#21): forwards what's typed, and empties on × or Esc.
// Matching is domain logic (domain/search.js); this only reads and renders.
export function bindSearchBox(input, clearBtn, onQuery) {
  const clear = () => {
    input.value = "";
    input.focus();
    onQuery("");
  };
  input.addEventListener("input", () => onQuery(input.value));
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") clear(); });
  clearBtn.addEventListener("click", clear);
}

// Setting value to the text it already holds leaves the caret where it is.
export function renderSearchBox(input, clearBtn, query) {
  input.value = query;
  clearBtn.hidden = !query;
}

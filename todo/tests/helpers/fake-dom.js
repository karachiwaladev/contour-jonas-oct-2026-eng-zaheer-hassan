// A minimal DOM for src/ui and src/main.js tests: elements, text, single-token
// selectors (.class, #id, tag), bubbling events, <template>, forms. Load real
// markup with createDocument(html) so tests follow index.html.
import { parseHtml } from "./parse-html.js";

const text = (value) => ({ nodeType: 3, value: String(value) });
const isEl = (n) => n.nodeType === 1;

// A <select> resets to its option marked selected, else its first option.
function defaultOption(select) {
  const options = select.querySelectorAll("option");
  return (options.find((o) => o.getAttribute("selected") !== null) ?? options[0])?.value ?? "";
}

class FakeElement {
  constructor(doc, tagName, attrs = {}) {
    Object.assign(this, { nodeType: 1, doc, tagName: tagName.toUpperCase(), childNodes: [], parent: null });
    Object.assign(this, { listeners: {}, dataset: {}, attrs: {}, className: "", id: "", name: "", type: "" });
    Object.assign(this, { value: "", defaultValue: "", checked: false, hidden: false, title: "" });
    if (tagName === "template") this.content = new FakeElement(doc, "fragment");
    for (const [k, v] of Object.entries(attrs)) this.setAttribute(k, v);
  }
  get children() { return this.childNodes.filter(isEl); }
  get firstElementChild() { return this.children[0] ?? null; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    return { add: (c) => { this.className = [...list(), c].join(" "); }, contains: (c) => list().includes(c) };
  }
  get textContent() { return this.childNodes.map((n) => (isEl(n) ? n.textContent : n.value)).join(""); }
  set textContent(v) { this.replaceChildren(text(v)); }
  get elements() { return { namedItem: (name) => this.descendants().find((el) => el.name === name) ?? null }; }

  setAttribute(k, v) {
    const props = { class: "className", id: "id", name: "name", type: "type", title: "title" };
    if (k.startsWith("data-")) this.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v;
    else if (props[k]) this[props[k]] = v;
    else if (k === "hidden" || k === "checked") this[k] = true;
    else if (k === "value") this.value = this.defaultValue = v;
    else this.attrs[k] = String(v);
  }
  getAttribute(k) { return this.attrs[k] ?? null; }

  append(...nodes) {
    for (const n of nodes) {
      const node = typeof n === "string" ? text(n) : n;
      if (isEl(node)) { node.remove(); node.parent = this; }
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const n of this.children) n.parent = null;
    this.childNodes = [];
    this.append(...nodes);
  }
  remove() {
    if (!this.parent) return;
    this.parent.childNodes = this.parent.childNodes.filter((n) => n !== this);
    this.parent = null;
  }
  cloneNode(deep) {
    const copy = new FakeElement(this.doc, this.tagName.toLowerCase());
    for (const k of ["className", "id", "name", "type", "value", "defaultValue", "checked", "hidden", "title"]) copy[k] = this[k];
    Object.assign(copy.dataset, this.dataset);
    Object.assign(copy.attrs, this.attrs);
    if (deep) copy.append(...this.childNodes.map((n) => (isEl(n) ? n.cloneNode(true) : text(n.value))));
    return copy;
  }

  descendants() { return this.children.flatMap((c) => [c, ...c.descendants()]); }
  matches(sel) {
    if (sel.startsWith(".")) return this.classList.contains(sel.slice(1));
    if (sel.startsWith("#")) return this.id === sel.slice(1);
    return this.tagName === sel.toUpperCase();
  }
  querySelector(sel) { return this.descendants().find((el) => el.matches(sel)) ?? null; }
  querySelectorAll(sel) { return this.descendants().filter((el) => el.matches(sel)); }
  closest(sel) {
    for (let el = this; el && isEl(el); el = el.parent) if (el.matches(sel)) return el;
    return null;
  }

  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
  reset() {
    for (const el of this.descendants()) {
      el.value = el.tagName === "SELECT" ? defaultOption(el) : el.defaultValue;
    }
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super(null, "#document");
    this.doc = this;
    this.activeElement = null;
  }
  createElement(tag) {
    // Browsers reject an empty name or one with whitespace, quotes, "/", ">" or "=".
    if (!/^[a-z][^\s"'/>=]*$/i.test(tag)) throw Object.assign(new Error(`InvalidCharacterError: "${tag}"`), { name: "InvalidCharacterError" });
    return new FakeElement(this, tag);
  }
  getElementById(id) { return id ? this.querySelector(`#${id}`) : null; }
}

// Parses html into a new document. A <template>'s children go to its .content.
export function createDocument(html = "") {
  const doc = new FakeDocument();
  return parseHtml(html, doc, {
    element: (tag, attrs) => new FakeElement(doc, tag, attrs),
    text: (value) => (value.trim() ? text(value) : null),
    append: (parent, child) => child && (parent.tagName === "TEMPLATE" ? parent.content : parent).append(child),
  });
}

// Fires an event at target and bubbles it to the document. Resolves once every
// (possibly async) listener has finished.
export function dispatch(target, type) {
  const event = { type, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  const results = [];
  for (let el = target; el; el = el.parent) results.push(...(el.listeners[type] || []).map((fn) => fn(event)));
  return Promise.all(results).then(() => event);
}

// Tiny parser for well-formed HTML like index.html: tags, quoted attributes,
// void elements and text. Comments and the doctype are skipped.
const VOID = new Set(["meta", "link", "input", "br", "img", "hr"]);
const TOKEN = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-z0-9-]+)\s*>|<([a-z0-9-]+)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/gi;
const ATTR = /([^\s=]+)(?:="([^"]*)")?/g;

// build = { element(tag, attrs), text(string), append(parent, child) }
export function parseHtml(html, root, build) {
  const stack = [root];
  for (const [, close, open, attrText, text] of html.matchAll(TOKEN)) {
    const parent = stack[stack.length - 1];
    if (text !== undefined) build.append(parent, build.text(text));
    else if (close) stack.pop();
    else if (open) {
      const attrs = Object.fromEntries([...(attrText || "").matchAll(ATTR)].map(([, k, v]) => [k, v ?? ""]));
      const el = build.element(open.toLowerCase(), attrs);
      build.append(parent, el);
      if (!VOID.has(open.toLowerCase())) stack.push(el);
    }
  }
  return root;
}

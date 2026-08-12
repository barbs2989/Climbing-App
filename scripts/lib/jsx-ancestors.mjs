// Which JSX elements ENCLOSE this one, and what is in their inline style?
//
// Written for check:flex-scroll, which has to ask "is this scroll pane a child of a
// height-capped flex column?" — a question about ANCESTRY, not proximity. It used to look
// back a fixed 3,000 characters for `flexDirection:"column"` and drop the pane with a bare
// `continue` when it found none. On this codebase that is most of the coverage: the longest
// single line in ClimbMatch.jsx is 58,365 characters, so a parent can be one physical line
// and several thousand characters back. Measured before this rewrite, **28 of 50** overflow
// panes fell outside the window and were never evaluated, against 22 that were — and nothing
// said so, because a skipped pane printed exactly like a clean one.
//
// TWO IMPLEMENTATIONS WERE TRIED AND THE FIRST WAS WRONG. A hand-rolled tag stack (scan for
// `<`, push on open, pop on `</`) desynchronises on FRAGMENTS: `<>` has no tag name so it is
// never pushed, while `</>` still pops, and the app uses 19 of them in ClimbMatchCore.jsx
// alone. Measured, the stack never unwound — depth at the last element was 3, 8 and 5 in the
// three biggest files instead of 0, so every ancestry answer after the first fragment was
// suspect, including a "finding" it produced. Distrust the first run of any such probe; see
// the 15 -> 3 progression recorded for check:field-renders.
//
// So it parses. @babel/parser with the `jsx` plugin is already how check:refs and
// check:hooks read these files, it gets fragments, conditional children, self-closing tags
// and apostrophes in prose right by construction, and ancestry is just the path stack.

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

export function parseJsx(code) {
  return parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
}

// The inline `style={{…}}` of one JSX element, as a flat {prop: rawSourceText} map.
// Values are kept as source text rather than evaluated: they are literals, template strings,
// ternaries and palette lookups, and every question asked of them here is textual
// ("is it 0?", "is it 'column'?").
export function styleProps(openingElement, code) {
  const attr = (openingElement.attributes || []).find(
    a => a.type === "JSXAttribute" && a.name && a.name.name === "style"
  );
  if (!attr || !attr.value || attr.value.type !== "JSXExpressionContainer") return null;
  const obj = attr.value.expression;
  if (!obj || obj.type !== "ObjectExpression") return null;
  const out = {};
  for (const p of obj.properties) {
    if (p.type !== "ObjectProperty" || p.computed) continue;
    const key = p.key.name || p.key.value;
    if (key == null) continue;
    out[String(key)] = code.slice(p.value.start, p.value.end);
  }
  return out;
}

// Visit every JSX element. `ancestors` is a FUNCTION, not an array, and that is a
// performance decision with teeth: this app has ~7,400 JSX elements across ~2 MB, and
// materialising an ancestor list plus parsing a style object for every one of them made the
// guard exceed a 120-second timeout — unacceptable for something sitting in `npm run build`.
// Callers filter on the element's own style first (cheap) and resolve ancestry only for the
// handful that survive. Measured after: well under check:refs, which parses the same files.
export function walkElements(code, visit) {
  const ast = parseJsx(code);
  traverse(ast, {
    JSXElement(path) {
      visit(path.node.openingElement, () => {
        const out = [];
        let p = path.parentPath;
        while (p) {
          if (p.node.type === "JSXElement") out.unshift(p.node.openingElement);
          p = p.parentPath;
        }
        return out;
      }, path.node);
    },
  });
}

// Does this opening tag carry a `style={{…}}` at all? A substring test on the tag's own
// source range, so the object is never parsed for the ~93% of elements that have none.
export function hasStyle(openingElement, code) {
  return code.lastIndexOf("style={{", openingElement.end) > openingElement.start;
}

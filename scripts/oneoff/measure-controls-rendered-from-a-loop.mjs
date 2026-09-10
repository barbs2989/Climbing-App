// HOW MUCH OF THIS APP'S UI IS A CONTROL GROUP RENDERED FROM A LOOP?
//
// #1651 found a switch that suppressed nothing, and the census built to find exactly that kind of
// defect had reported "0 volatile" — because it reads controls ONE JSX SITE AT A TIME and keys on
// a string-literal `aria-label`, while the four switches are `[[key,label,sub],…].map(…)` with
// `aria-label={"Toggle "+o[1]}`. One site, four controls, silently dropped.
//
// That is a property of the SCAN, not of that census, so this asks how large the blind spot is
// across the whole app and which guards share it. A guard that walks JSX sites sees a `.map`ped
// group as ONE control with an unreadable name — so it either drops the group or counts it once,
// and both read as coverage.
//
// Read-only, no DB, no browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// A control is an element a person can operate: a native one, or anything carrying an interactive
// role or a state attribute. Same vocabulary the sibling guards use.
const NATIVE = new Set(["button", "select", "input", "textarea", "a"]);
const STATE_ATTRS = ["aria-checked", "aria-pressed", "aria-current", "aria-selected", "aria-expanded"];

let sites = 0, inLoop = 0, litLabel = 0, computedLabel = 0, noLabel = 0;
const groups = [];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    JSXOpeningElement(p) {
      const attrs = p.node.attributes.filter((a) => a.name);
      const attr = (n) => attrs.find((a) => a.name.name === n);
      const tag = p.node.name.name;
      const role = attr("role");
      const roleVal = role && role.value && role.value.type === "StringLiteral" ? role.value.value : null;
      const interactive = NATIVE.has(tag)
        || (roleVal && /^(button|checkbox|switch|radio|tab|link|menuitem|option)$/.test(roleVal))
        || STATE_ATTRS.some((a) => attr(a))
        || attrs.some((a) => a.name.name === "onClick");
      if (!interactive) return;
      sites++;

      // Is this site inside a .map callback? Ancestors, never a character window.
      let cb = null;
      for (let up = p.parentPath; up; up = up.parentPath) {
        const n = up.node;
        if (n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression"
            && n.callee.property && /^(map|flatMap)$/.test(n.callee.property.name)) { cb = n; break; }
      }
      if (!cb) return;
      inLoop++;

      const label = attr("aria-label");
      if (!label) noLabel++;
      else if (label.value && label.value.type === "StringLiteral") litLabel++;
      else computedLabel++;

      // How many controls does this ONE site render? Knowable only when the .map source is a
      // literal array; otherwise it is data-driven and the count is unbounded.
      const obj = cb.callee.object;
      const n = obj && obj.type === "ArrayExpression" ? obj.elements.length : null;
      groups.push({
        file: f,
        tag: tag + (roleVal ? ` role=${roleVal}` : ""),
        members: n,
        label: !label ? "(none)" : label.value && label.value.type === "StringLiteral" ? `"${label.value.value}"` : "COMPUTED",
        src: src.slice(p.node.start, p.node.start + 70).replace(/\s+/g, " "),
      });
    },
  });
}

console.log(`${sites} interactive JSX site(s) across ${FILES.length} app files`);
console.log(`${inLoop} of them are inside a .map — one site, several controls\n`);
console.log(`  of those ${inLoop}:  ${litLabel} string-literal aria-label   ${computedLabel} COMPUTED aria-label   ${noLabel} no aria-label\n`);

const known = groups.filter((g) => g.members !== null);
const total = known.reduce((a, g) => a + g.members, 0);
console.log(`${known.length} group(s) map a LITERAL array, so their member count is knowable: ${total} controls rendered from ${known.length} sites.`);
console.log(`${groups.length - known.length} more map a variable, so how many controls they render depends on the data.\n`);

console.log("groups over a literal array, largest first:");
for (const g of known.sort((a, b) => b.members - a.members)) {
  console.log(`  ${String(g.members).padStart(3)} controls  ${g.label.padEnd(26)} ${g.file.padEnd(19)} ${g.src.slice(0, 60)}`);
}

console.log("\ncomputed-label groups (the shape that defeated the settings census):");
for (const g of groups.filter((g) => g.label === "COMPUTED")) {
  console.log(`  ${g.file.padEnd(19)} ${String(g.members ?? "?").padStart(3)} member(s)  ${g.src.slice(0, 74)}`);
}

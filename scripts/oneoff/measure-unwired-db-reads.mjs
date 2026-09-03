// Which reads does lib/db.js export that nothing calls — and which are called for OTHER people
// but never for you?
//
// WHY THIS SHAPE. #1497's defect was not a missing query. `useClimberVouches()` reads `to_id` and
// had existed the whole time; its only call site was `useClimberVouches(_realId)` inside
// FullProfile, and `_realId` is null unless the id is a uuid — and ME.id is 0 signed in or out.
// So the read was wired for every climber EXCEPT the signed-in one, and the Profile's tile added
// two structural zeroes instead. Nothing reported it: the column was populated, the row was
// readable, the screen rendered, and every guard was green.
//
// The general question is therefore not "is there a query" but "is it ever asked about ME", and
// the two cheap proxies for it are:
//
//   A. an exported read with NO call site at all — built and never wired
//   B. an exported read whose call sites never pass a self identity (`uid`, `DB_UID`, `myUid`)
//
// B IS A READING LIST, NOT A DEFECT COUNT, and the distinction is the whole point. Plenty of reads
// are correctly about somebody else: useClimberVouches for a profile you are viewing, useFullProfile
// for a partner, useAreaRoutes for a crag. What makes a row worth reading is a read that is ALSO a
// fact about you — the vouch shape. This script cannot tell those apart; it narrows ~90 exports to
// a handful somebody can read in a few minutes.
//
// FIRST RUN, 2026-09-02: 60 read hooks, 57 called. Bucket A held THREE, and reading them is what
// separated one finding from two non-findings — recorded so nobody re-derives them:
//
//   useCrewListings   A REAL GAP. `crew_listings` is a view built deliberately in 0036, with a
//                     comment explaining it uses view-owner privileges specifically so it can
//                     expose the browsable columns of `crews` without ever leaking float_plan or
//                     meet_place, and it is granted to anon and authenticated. Nothing reads it.
//                     `CrewFinder` — the "Join a crew" screen — lists the seed `OPEN_CREWS` array
//                     and nothing else, so a real climber's open crew cannot be found by another
//                     real climber. The only other read of crews is useMyCrews(uid), your own.
//                     Wiring it is feature work (route names, organiser profiles, the join flow
//                     for a DB crew), so it is REPORTED rather than built.
//   useCrewMessages   superseded, not missing. The initial load is
//   useDirectMessages `fetchOlderCrewMessages(id, MSG_PAGE, null)` — one function serving both the
//                     first page and paging, with a null cursor meaning "most recent".
//
// Two more never-called exports are outside this scan because they are not useQuery hooks, and
// they are superseded the same way: `useCrewMessagesRealtime` / `useDirectMessagesRealtime`, which
// App replaces with five inline `.channel()` subscriptions of its own.
//
// Static: Babel over lib/db.js and the three app files plus lib/*.jsx. No browser, no database.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB = path.join(ROOT, "lib", "db.js");

const parseFile = (f) =>
  parse(fs.readFileSync(f, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

// ---- what lib/db.js exports, and which of those are READS ----
const dbAst = parseFile(DB);
const reads = new Map(); // name -> { queryKey, filters }

traverse(dbAst, {
  ExportNamedDeclaration(p) {
    const d = p.node.declaration;
    if (!d) return;
    const name = d.type === "FunctionDeclaration" ? d.id && d.id.name : null;
    if (!name) return;
    // A read is a hook wrapping useQuery. Mutations are plain async functions.
    let isRead = false, key = null, cols = [];
    p.traverse({
      CallExpression(c) {
        const cal = c.node.callee;
        if (cal.type === "Identifier" && cal.name === "useQuery") isRead = true;
        if (cal.type === "MemberExpression" && cal.property.type === "Identifier") {
          const m = cal.property.name;
          if (m === "eq" || m === "or" || m === "in") {
            const a = c.node.arguments[0];
            if (a && a.type === "StringLiteral") cols.push(`${m}:${a.value}`);
          }
        }
      },
      ObjectProperty(o) {
        if (o.node.key.type === "Identifier" && o.node.key.name === "queryKey") {
          const v = o.node.value;
          if (v.type === "ArrayExpression" && v.elements[0] && v.elements[0].type === "StringLiteral") key = v.elements[0].value;
        }
      },
    });
    if (isRead) reads.set(name, { key, cols: [...new Set(cols)] });
  },
});

if (reads.size < 20) {
  console.error(`FAIL — only ${reads.size} read hooks parsed out of lib/db.js. That is a broken scan, not a small API.`);
  process.exit(1);
}

// ---- where they are called, and with what ----
const files = [
  path.join(ROOT, "ClimbMatch.jsx"),
  path.join(ROOT, "ClimbMatchCore.jsx"),
  path.join(ROOT, "RouteDetail.jsx"),
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => f.endsWith(".jsx")).map((f) => path.join(ROOT, "lib", f)),
];

// The names a self identity actually travels under in this codebase. `uid` is App's; DB_UID is the
// core module global written by __set_DB_UID; the rest are what the lib components call it.
const SELF = new Set(["uid", "DB_UID", "myUid", "meUid", "userId", "selfId"]);
const calls = new Map(); // name -> [{file, arg}]

for (const f of files) {
  let ast;
  try { ast = parseFile(f); } catch { continue; }
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "Identifier" || !reads.has(c.name)) return;
      const a = p.node.arguments[0];
      let arg = "()";
      if (a) {
        if (a.type === "Identifier") arg = a.name;
        else if (a.type === "MemberExpression") arg = "<member>";
        else if (a.type === "StringLiteral") arg = `"${a.value}"`;
        else arg = `<${a.type}>`;
      }
      if (!calls.has(c.name)) calls.set(c.name, []);
      calls.get(c.name).push({ file: path.basename(f), arg });
    },
  });
}

if (calls.size === 0) {
  console.error("FAIL — no call site found for any read hook. The traversal is broken.");
  process.exit(1);
}

const unwired = [], notSelf = [], selfWired = [];
for (const [name, meta] of [...reads].sort()) {
  const sites = calls.get(name) || [];
  if (!sites.length) { unwired.push({ name, meta }); continue; }
  const anySelf = sites.some((s) => SELF.has(s.arg));
  (anySelf ? selfWired : notSelf).push({ name, meta, sites });
}

console.log(`lib/db.js exports ${reads.size} read hooks. ${calls.size} of them are called somewhere.\n`);

console.log(`A. NEVER CALLED — ${unwired.length}`);
console.log("   Built and not wired. A read nothing calls cannot be wrong on screen, which is why");
console.log("   nothing reports it; it is also a feature that silently does not exist.");
for (const u of unwired) console.log(`   ${u.name}${u.meta.key ? `  [${u.meta.key}]` : ""}${u.meta.cols.length ? `  ${u.meta.cols.join(" ")}` : ""}`);

console.log(`\nB. CALLED, BUT NEVER WITH A SELF IDENTITY — ${notSelf.length}`);
console.log("   A READING LIST. Most are correctly about somebody else. Ask of each: is this ALSO");
console.log("   a fact about me, and does any screen of mine claim to know it? That question is");
console.log("   what #1497 was, and it is not mechanically decidable from here.");
for (const n of notSelf) {
  const args = [...new Set(n.sites.map((s) => s.arg))].join(", ");
  console.log(`   ${n.name}  <- ${args}   (${[...new Set(n.sites.map((s) => s.file))].join(", ")})`);
}

console.log(`\nC. asked about me somewhere — ${selfWired.length} (not listed)`);
console.log("\n   A count here is not a defect count. Read the sites before acting.");

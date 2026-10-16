// Fails the build when lib/db.js reads a table or column the database does not have.
//
// Why this exists: PostgREST does not error on a missing column. `select("*")`
// simply omits it, and a mapper's `toArr(r.gone)` returns []. PR #372 shipped a
// whole Safety-tab feature reading `routes.hazard_tags` after migration 0060 had
// dropped that column — it rendered nothing, raised nothing, and passed CI. The
// only signal was a human noticing an empty panel.
//
// Checked against scripts/schema-snapshot.json (refresh with
// scripts/refresh-schema-snapshot.mjs). Runs offline, so CI needs no credentials.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
const TABLES = snapshot.tables;
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const lineOf = (i) => src.slice(0, i).split("\n").length;
const problems = [];

/* Comments are blanked before anything is matched, because a comment that DISCUSSES a column
   read is not a column read. This guard scanned raw source, so writing `r.rock ?? r.rockType`
   in prose above the mapper — to explain why the fallback was removed — failed the build
   claiming the mapper read a column that does not exist. It did not; the sentence said so.
   Same "presence is not use" false positive check:fire and check:rappel-readers each shipped
   and fixed, arriving from the opposite direction: there a comment naming the guard token made
   a broken reader look guarded, here a comment naming a column makes a correct mapper look
   broken. Both are the mistake of asking whether a string appears rather than whether the code
   does it.

   Blanking is CHARACTER-FOR-CHARACTER (comment bytes become spaces, newlines kept) so every
   offset — and therefore every line number this guard prints — stays true. String contents
   are deliberately left ALONE: `.from("routes")` and the select lists are string literals and
   are exactly what checks 2 and 3 below read, so a blanker that wiped them would blind the
   guard. Comments only. lib/db.js is plain JS with no JSX, so tracking a `'` as a quote is
   safe here in a way it is not in the .jsx files. */
function blankComments(s) {
  let out = "", i = 0, quote = null;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += n === undefined ? "" : n; i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === "/" && n === "/") {
      const nl = s.indexOf("\n", i), end = nl < 0 ? s.length : nl;
      out += " ".repeat(end - i); i = end; continue;
    }
    if (c === "/" && n === "*") {
      const e = s.indexOf("*/", i + 2), end = e < 0 ? s.length : e + 2;
      // keep newlines so line numbers do not shift
      out += s.slice(i, end).replace(/[^\n]/g, " "); i = end; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}
const code = blankComments(src);
if (code.length !== src.length) {
  console.error("check:schema-drift FAILED — comment blanking changed the file length, so every");
  console.error("line number below would be wrong. Refusing to report against shifted offsets.");
  process.exit(1);
}


// Body of a function, by brace matching from its opening "{". Walks the BLANKED text: a "{"
// inside a comment would otherwise unbalance the walk and end the body in the wrong place.
function bodyOf(name) {
  const m = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(code);
  if (!m) return null;
  let i = m.index + m[0].length - 1, depth = 0;
  for (let j = i; j < code.length; j++) {
    if (code[j] === "{") depth++;
    else if (code[j] === "}" && --depth === 0) return { text: code.slice(i, j + 1), start: i };
  }
  return null;
}

// 1. Row-mapper property reads. `r.foo` inside dbRouteToCamel must be a routes
//    column — or an embedded relation, which is named after the table it joins.
const mapper = bodyOf("dbRouteToCamel");
if (!mapper) problems.push({ line: 0, msg: "dbRouteToCamel not found — checker needs updating" });
else {
  const cols = new Set(TABLES.routes || []);
  const seen = new Set();
  for (const m of mapper.text.matchAll(/\br\??\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const col = m[1];
    if (seen.has(col)) continue;
    seen.add(col);
    if (cols.has(col) || TABLES[col]) continue; // real column, or an embedded relation
    problems.push({ line: lineOf(mapper.start + m.index), msg: `dbRouteToCamel reads r.${col} — no such column on "routes"` });
  }
}

// 2. Table names in .from("x"). Blanked text, so a commented-out query cannot fail the build.
for (const m of code.matchAll(/\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)/g)) {
  if (TABLES[m[1]]) continue;
  problems.push({ line: lineOf(m.index), msg: `.from("${m[1]}") — no such table` });
}

// 3. Explicit column lists in .select("a,b"), scoped to the nearest preceding .from() —
//    INCLUDING the columns inside embedded resources, foo(...).
//
//    Embeds used to be stripped here and left to rule 2, which only checks that the embedded
//    TABLE exists. That left the worse half unguarded: a bad column inside an embed makes
//    PostgREST answer 42703 and fail the ENTIRE query, where a bad top-level column costs one
//    field. Measured — `guide_documents(… created_at)` (the column is `uploaded_at`) sailed
//    through a full `npm run build` and rendered the whole screen as its error state.
//
//    Splitting has to respect parens: a comma inside foo(a,b) is not a top-level separator.
const splitTop = (list) => {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
};

// Embeds come in four shapes. Three name a table and can be checked:
//   profiles(name)                    plain
//   author:profiles(name)             aliased
//   profiles!some_fkey(name)          disambiguated by FK name
// The fourth embeds through a FOREIGN KEY COLUMN — sender:sender_id(name) — and naming the
// target table needs FK metadata the snapshot does not carry. Those are SKIPPED and COUNTED,
// never silently dropped: an unvalidated thing you cannot see is how this gap survived.
const skippedEmbeds = [];
const checkList = (table, list, line) => {
  const cols = TABLES[table];
  if (!cols) return; // rule 2 already reported it
  for (const tok of splitTop(list)) {
    const open = tok.indexOf("(");
    if (open >= 0) {
      const head = tok.slice(0, open).trim();
      const close = tok.lastIndexOf(")");
      const inner = close > open ? tok.slice(open + 1, close) : "";
      let target = head.includes(":") ? head.split(":").pop() : head;
      target = target.split("!")[0].trim();
      if (TABLES[target]) checkList(target, inner, line);
      else skippedEmbeds.push(head);
      continue;
    }
    const col = (tok.includes(":") ? tok.split(":").pop() : tok).trim();
    // `count` is a PostgREST aggregate, not a column; `*` is everything.
    if (!col || col === "*" || col === "count") continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) continue;
    if (!cols.includes(col)) problems.push({ line, msg: `.select(...) requests "${table}.${col}" — no such column` });
  }
};
for (const m of code.matchAll(/\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)\s*\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
  checkList(m[1], m[2], lineOf(m.index));
}

if (problems.length) {
  console.error(`\nSchema drift — lib/db.js references ${problems.length} thing(s) the database does not have:\n`);
  for (const p of problems.sort((a, b) => a.line - b.line)) console.error(`  lib/db.js:${p.line}  ${p.msg}`);
  console.error(`\nSnapshot generated ${snapshot.generatedAt}. If the schema changed on purpose, run:`);
  console.error(`  node scripts/refresh-schema-snapshot.mjs\n`);
  process.exit(1);
}
const skipNote = skippedEmbeds.length
  ? ` ${new Set(skippedEmbeds).size} embed(s) join through a foreign-key column (${[...new Set(skippedEmbeds)].sort().join(", ")}) and are not column-checked — the snapshot carries no FK metadata.`
  : "";
console.log(`check-schema: ok — lib/db.js matches the ${snapshot.generatedAt} snapshot (${Object.keys(TABLES).length} tables).${skipNote}`);

/* Injection-tested 2026-08-12, six cases, all as expected. Three must FAIL and three must
   PASS, and the passes are the point — a blanker that is too eager turns a build gate off:
     0. clean tree                                                 -> exit 0
     1. `zzTest: r.no_such_column_xyz` in the mapper               -> exit 1, names the column,
                                                                      reports its real line
     2. that same text inside a comment                            -> exit 0
     3. `sb.from("no_such_table_xyz")` in real code                -> exit 1
     4. the same `.from()` commented out                           -> exit 0
     5. an unbalanced `}` in a comment at the top of the mapper,
        plus the case-1 bad read                                   -> exit 1  (the brace must
                                                                      not truncate the walk and
                                                                      hide the read below it)
   Case 1 is the one that keeps this honest: the whole change is about matching less, so the
   risk is a guard that has quietly stopped matching anything. The line number is asserted
   too, since blanking that dropped characters instead of replacing them would still catch the
   defect while pointing at the wrong line. */

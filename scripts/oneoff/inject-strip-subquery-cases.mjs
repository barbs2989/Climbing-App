import fs from "fs";

/* Pins `stripSubqueries` in check-sql-targets.mjs, which decides which ids a statement actually
   WRITES TO. Getting it wrong is not cosmetic: the ids it returns are what the only-copy rule
   protects, and that rule exists because a real route (Triple Couloirs) was destroyed by a delete
   whose "duplicate" twin did not exist.

   Two shipped versions were each wrong in an OPPOSITE direction, and neither was visible by reading
   the function:

     1. The innermost-paren loop removed a group only once it contained no parens of its own. A
        function call anywhere inside a subquery — jsonb_array_length(x), count(*), coalesce(a,b) —
        therefore stayed forever, the enclosing `exists (select ...)` never became innermost, and
        the subquery was never stripped. Its ids counted as write targets, so the guard FAILED the
        guarded delete (the safe form, which names its twin in an EXISTS clause) and PASSED the
        unguarded one. Exactly backwards.

     2. Unwrapping non-select groups instead fixed that and broke `id in ('a','b')` — the parens the
        IN-list matcher needs were gone, so those delete targets became INVISIBLE. A missed target
        is the false-pass direction, and worse than the bug being fixed.

   Case 4 is the regression that fix (2) introduced. Case 3 must keep working or the guard has
   stopped seeing plain deletes at all.

   Run: node scripts/oneoff/inject-strip-subquery-cases.mjs */

const SRC = new URL("../check-sql-targets.mjs", import.meta.url);
const src = fs.readFileSync(SRC, "utf8");
const m = src.match(/function stripSubqueries[\s\S]*?\n}\n/);
if (!m) { console.error("ANCHOR LOST — stripSubqueries not found in check-sql-targets.mjs"); process.exit(1); }
/* Lifted out of the real file rather than copied, so this cannot pass against a stale duplicate —
   the ANCHOR LOST check above is what makes a rename loud instead of silent. */
const fn = new Function(m[0] + "\nreturn stripSubqueries;")();

const Q = "'";
const CASES = [
  ["guarded delete whose EXISTS calls a function",
   `delete from routes where id=${Q}stray${Q} and exists (select 1 from routes s where s.id=${Q}keeper${Q} and jsonb_array_length(s.v)>=1);`,
   ["stray"]],
  ["guarded delete with no function call",
   `delete from routes where id=${Q}stray${Q} and exists (select 1 from routes s where s.id=${Q}keeper${Q} and s.v is not null);`,
   ["stray"]],
  ["an UNGUARDED delete must still be seen",
   `delete from routes where id=${Q}stray${Q};`,
   ["stray"]],
  ["id IN (...) must keep its parens",
   `delete from routes where id in (${Q}a${Q},${Q}b${Q});`,
   ["a", "b"]],
  ["nested function calls inside the subquery",
   `delete from routes where id=${Q}stray${Q} and exists (select 1 from routes s where s.id=${Q}keeper${Q} and coalesce(count(s.v),0)>0);`,
   ["stray"]],
  ["an IN list AND a function-bearing guard together",
   `delete from routes where id in (${Q}a${Q},${Q}b${Q}) and exists (select 1 from routes s where s.id=${Q}keeper${Q} and count(s.v)>0);`,
   ["a", "b"]],
];

/* Mirrors the extraction in check-sql-targets.mjs. Deliberately a copy: importing the real one
   would make this vacuous if that code changed shape, and the point is to pin the CONTRACT. */
const idsOf = sql => {
  const scrub = fn(sql);
  const ids = new Set();
  for (const mm of scrub.matchAll(/\bid\s*=\s*'([^']+)'/gi)) ids.add(mm[1]);
  const inC = scrub.match(/\bid\s+in\s*\(([^)]*)\)/i);
  if (inC) for (const mm of inC[1].matchAll(/'([^']+)'/g)) ids.add(mm[1]);
  return [...ids].sort();
};

let bad = 0;
for (const [label, sql, want] of CASES) {
  const got = idsOf(sql);
  const ok = JSON.stringify(got) === JSON.stringify(want.slice().sort());
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}\n       got ${JSON.stringify(got)}  want ${JSON.stringify(want.slice().sort())}`);
}
console.log(bad ? `\n${bad} case(s) FAILED` : `\nall ${CASES.length} cases pass`);
process.exit(bad ? 1 : 0);

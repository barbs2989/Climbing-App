// A declared-state repair engine for catalog rows, factored out of the rappel repair so the
// suspect-backlog batches do not each re-implement it — and re-implement its bugs.
//
// THE CONTRACT
//   * every repair declares the SHA of the value it expects to find at its path, and a row that
//     has moved is REFUSED rather than clobbered. This branch carries ~80 commits of repairs and
//     other sessions write concurrently, so a stale declaration is the normal case, not an edge.
//   * jsonb key order is NOT preserved by Postgres, so comparisons are canonical (keys sorted
//     recursively). Comparing JSON.stringify output reports MISMATCH on a write that landed
//     perfectly — that cost a whole reconcile pass on the rappel batch before it was found.
//   * a `copy` repair names ANOTHER PATH IN THE SAME ROW as its source. No coordinate or figure
//     is ever typed into a repair table, so a fix that needs a value the row does not already
//     hold cannot be expressed at all.
//   * an `edit` must match its `find` an exact declared number of times, or it is refused.
//
// Kinds:
//   {kind:"set",   route, path, expect, value, why}
//   {kind:"copy",  route, path, expect, from,  why}       value := the row's own value at `from`
//   {kind:"edit",  route, path, expect, find, repl, count, why}   string replace at a path
//   {kind:"jsonedit", route, column, expect, find, repl, count, why}
//        serialise a jsonb column, replace a plain substring inside its string values, reparse.
//        Safe only for needles containing no quote/backslash — asserted.
import crypto from "crypto";
import { selectAll, patchRow } from "../../lib/supabase-env.mjs";

export const canon = v => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]);
    return o;
  }
  return v;
};
export const sha = v => crypto.createHash("sha256")
  .update(v === undefined ? " ABSENT" : v === null ? " NULL" : (typeof v === "string" ? v : JSON.stringify(canon(v))))
  .digest("hex").slice(0, 16);

const seg = p => String(p).split(".").map(s => (/^\d+$/.test(s) ? Number(s) : s));
export function getPath(obj, path) {
  let cur = obj;
  for (const s of seg(path)) { if (cur == null) return undefined; cur = cur[s]; }
  return cur;
}
// returns a DEEP COPY of the top-level column with the value replaced at `path`
function withPath(row, path, value) {
  const parts = seg(path);
  const col = parts[0];
  if (parts.length === 1) return { col, next: value };
  const clone = JSON.parse(JSON.stringify(row[col] === undefined ? null : row[col]));
  let cur = clone;
  for (let i = 1; i < parts.length - 1; i++) {
    if (cur == null) throw new Error(`path ${path} runs through a null at segment ${parts[i]}`);
    cur = cur[parts[i]];
  }
  if (cur == null) throw new Error(`path ${path} has a null parent`);
  cur[parts[parts.length - 1]] = value;
  return { col, next: clone };
}

export async function runRepairs(REPAIRS, opts = {}) {
  const apply = !!opts.apply;
  const filter = opts.filter || "id=like.wa_*";
  const select = opts.select || "*";
  const rows = await selectAll("routes", select, filter, { pageSize: 1000, key: opts.key });
  const byId = new Map(rows.map(r => [r.id, r]));

  if (opts.hashes) {
    for (const rep of REPAIRS) {
      const r = byId.get(rep.route);
      const path = rep.path || rep.column;
      console.log(`  ${rep.route}  ${path}: "${r ? sha(getPath(r, path)) : "ROW NOT FOUND"}"`);
    }
    return { planned: 0, refused: 0 };
  }

  // group by (route, column) so several repairs to one column compose instead of overwriting
  const staged = new Map();   // route -> { col -> value }
  const notes = [];
  let refused = 0;
  for (const rep of REPAIRS) {
    const r = byId.get(rep.route);
    const path = rep.path || rep.column;
    if (!r) { console.log(`REFUSE ${rep.route}: row not found`); refused++; continue; }

    const bag = staged.get(rep.route) || {};
    // read through anything already staged for this column, so repair N+1 sees repair N
    const view = { ...r, ...bag };
    const cur = getPath(view, path);
    const got = sha(cur);
    if (got !== rep.expect) {
      console.log(`REFUSE ${rep.route}.${path}: has moved (expected ${rep.expect}, found ${got})`);
      refused++; continue;
    }

    let next, col;
    try {
      if (rep.kind === "set") ({ col, next } = withPath(view, path, rep.value));
      else if (rep.kind === "copy") {
        const src = getPath(view, rep.from);
        if (src === undefined || src === null) { console.log(`REFUSE ${rep.route}.${path}: copy source ${rep.from} is empty`); refused++; continue; }
        ({ col, next } = withPath(view, path, src));
        rep._copied = src;
      } else if (rep.kind === "edit") {
        const s = String(cur ?? "");
        const n = s.split(rep.find).length - 1;
        if (n !== rep.count) { console.log(`REFUSE ${rep.route}.${path}: find matched ${n}x, declared ${rep.count}x`); refused++; continue; }
        ({ col, next } = withPath(view, path, s.split(rep.find).join(rep.repl)));
      } else if (rep.kind === "jsonedit") {
        if (/["\\]/.test(rep.find) || /["\\]/.test(rep.repl)) { console.log(`REFUSE ${rep.route}.${path}: jsonedit needle contains a quote or backslash`); refused++; continue; }
        const s = JSON.stringify(cur);
        const n = s.split(rep.find).length - 1;
        if (n !== rep.count) { console.log(`REFUSE ${rep.route}.${path}: find matched ${n}x, declared ${rep.count}x`); refused++; continue; }
        col = path; next = JSON.parse(s.split(rep.find).join(rep.repl));
      } else { console.log(`REFUSE ${rep.route}.${path}: unknown kind ${rep.kind}`); refused++; continue; }
    } catch (e) { console.log(`REFUSE ${rep.route}.${path}: ${e.message}`); refused++; continue; }

    bag[col] = next;
    staged.set(rep.route, bag);
    notes.push({ ...rep, col, before: cur, after: getPath({ ...r, ...bag }, path) });
  }

  console.log(`\n${"=".repeat(92)}\nPLAN: ${notes.length} repair(s) across ${staged.size} route(s), ${refused} refused\n`);
  for (const n of notes) {
    const b = n.before === undefined ? "(absent)" : JSON.stringify(n.before);
    const a = n.after === undefined ? "(absent)" : JSON.stringify(n.after);
    console.log(`${n.route}.${n.path || n.column}`);
    console.log(`   WHY: ${n.why}`);
    console.log(`   ${String(b).slice(0, 150)}  ->  ${String(a).slice(0, 150)}`);
  }

  if (!apply) { console.log(`\nDRY RUN — nothing written. Re-run with --apply.`); return { planned: notes.length, refused }; }

  console.log(`\n${"=".repeat(92)}\nAPPLYING\n`);
  for (const [route, bag] of staged) {
    await patchRow("routes", route, bag);
    console.log(`  wrote ${route}  (${Object.keys(bag).join(", ")})`);
  }
  const after = await selectAll("routes", select, filter, { pageSize: 1000, key: opts.key });
  const aById = new Map(after.map(r => [r.id, r]));
  let bad = 0;
  for (const [route, bag] of staged)
    for (const [col, v] of Object.entries(bag))
      if (sha(aById.get(route)[col]) !== sha(v)) { console.log(`  MISMATCH ${route}.${col}`); bad++; }
  console.log(bad === 0 ? `  reconciled: ${staged.size} route(s) hold exactly what was declared`
                        : `  ${bad} MISMATCH(ES) — investigate before trusting this run`);
  return { planned: notes.length, refused, bad };
}

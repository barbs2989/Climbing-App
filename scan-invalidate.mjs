// A write that succeeds but never refreshes its list leaves the user looking at stale
// data — and the reasonable response to "my thing didn't appear" is to submit it again.
//
// react-query only refetches when something invalidates the key (or a refetch is called).
// Find write helpers in lib/db.js and check whether each has a caller that invalidates or
// refetches afterwards.
import fs from "fs";
const db = fs.readFileSync("lib/db.js", "utf8");

// exported functions that perform a write
const writes = [];
const re = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g;
let m;
while ((m = re.exec(db))) {
  const name = m[1];
  // body = from here to the next export (crude but fine for this file's shape)
  const next = db.indexOf("\nexport ", m.index + 1);
  const body = db.slice(m.index, next === -1 ? db.length : next);
  if (!/\.(insert|update|upsert|delete)\s*\(/.test(body)) continue;
  writes.push(name);
}

const callers = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
                 "lib/DbGuides.jsx", "lib/DbGuideDashboard.jsx", "lib/DbGuideApply.jsx",
                 "lib/DbAreaBrowser.jsx", "lib/GpsSubmissionModal.jsx"];
const srcs = {};
for (const f of callers) { try { srcs[f] = fs.readFileSync(f, "utf8"); } catch {} }

console.log(`write helpers in lib/db.js: ${writes.length}\n`);
for (const w of writes) {
  const hits = [];
  for (const [f, s] of Object.entries(srcs)) {
    let i = -1;
    while ((i = s.indexOf(w + "(", i + 1)) !== -1) {
      // does the surrounding call site refresh anything?
      const win = s.slice(Math.max(0, i - 200), i + 900);
      const refreshes = /invalidateQueries|refetch|setQueryData/.test(win);
      hits.push({ f, line: s.slice(0, i).split("\n").length, refreshes });
    }
  }
  if (!hits.length) { console.log(`  ${w.padEnd(26)} no caller found`); continue; }
  const stale = hits.filter((h) => !h.refreshes);
  const mark = stale.length ? "STALE?" : "ok    ";
  console.log(`  ${mark} ${w.padEnd(26)} ${hits.length} call site(s)` +
    (stale.length ? "  -> " + stale.map((h) => `${h.f}:${h.line}`).join(", ") : ""));
}

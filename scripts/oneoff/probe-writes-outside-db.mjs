// Which WRITES does check:writes structurally never see?
//
// `check:writes` forbids a success message in front of a write whose failure is unobservable,
// and it derives its write vocabulary at runtime from `export async function` in lib/db.js.
// That is good design — a new db write is covered without editing the guard — and it means a
// write that never goes near lib/db.js is invisible to it by construction.
//
// That is not hypothetical. The six false "Copied" messages fixed in #1087 were exactly this
// shape: `navigator.clipboard.writeText` is a write, it can fail, every call site announced
// success anyway, and check:writes could not have seen one of them.
//
// So this enumerates the OTHER write surfaces the app touches directly and asks, for each,
// whether a success message sits in front of it. Report-only: many are genuinely
// fire-and-forget, and the question per row is whether the user is told something happened.
//
//   node scripts/oneoff/probe-writes-outside-db.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.(js|jsx)$/.test(f) && f !== "db.js").map(f => `lib/${f}`)];

// Write surfaces that bypass lib/db.js entirely. Each can fail, and each is something a user
// may have asked for.
const SURFACES = [
  { name: "clipboard", re: /navigator\.clipboard\.writeText\s*\(/g,
    note: "fails on an insecure context, a permissions policy, or Safari outside a user gesture" },
  { name: "localStorage", re: /localStorage\.(setItem|removeItem|clear)\s*\(/g,
    note: "throws when the quota is full or storage is disabled (Safari private mode)" },
  { name: "sessionStorage", re: /sessionStorage\.(setItem|removeItem|clear)\s*\(/g,
    note: "same failure modes as localStorage" },
  { name: "IndexedDB", re: /indexedDB\.(open|deleteDatabase)\s*\(/g,
    note: "asynchronous and rejects; a blocked upgrade hangs rather than throwing" },
  { name: "supabase storage", re: /\.storage\s*\.\s*from\s*\(/g,
    note: "uploads fail on size, MIME and RLS — and the failure is a returned error, not a throw" },
  { name: "supabase.rpc (direct)", re: /supabase\s*\.\s*rpc\s*\(/g,
    note: "a direct RPC outside lib/db.js is outside the guard's vocabulary" },
  { name: "Web Share", re: /navigator\.share\s*\(/g,
    note: "rejects when the user cancels, which is NOT a failure and must not be reported as one" },
  { name: "service worker", re: /navigator\.serviceWorker\.(register|getRegistration)/g,
    note: "registration rejects on an unsupported scope or a bad MIME type" },
  { name: "Notification", re: /Notification\.requestPermission\s*\(/g,
    note: "resolves to 'denied' rather than rejecting — a resolved promise is not consent" },
  { name: "geolocation", re: /navigator\.geolocation\.(getCurrentPosition|watchPosition)/g,
    note: "takes an error callback; omitting it means a denied permission is silent" },
];

// Surfaces whose error handler is an ARGUMENT rather than a promise rejection.
// IndexedDB is a THIRD shape again: its error handler is an event property (`req.onerror`),
// not an argument and not a rejection. lib/offline.js handles it correctly and also carries an
// explicit `blocked` handler, since neither onsuccess nor onerror follows that one.
const CALLBACK_ERR = new Set(["geolocation"]);
const EVENT_ERR = new Set(["IndexedDB"]);

// Count top-level arguments of the call whose "(" is at `open`. Brace-balanced, because these
// calls carry multi-line arrow functions full of commas.
function topLevelArgs(src, open) {
  if (src[open] !== "(") return 0;
  let depth = 0, args = 1;
  for (let k = open; k < Math.min(src.length, open + 6000); k++) {
    const ch = src[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) { depth--; if (!depth) return args; }
    else if (ch === "," && depth === 1) args++;
  }
  return args;
}

// Wording that asserts something happened. Deliberately the same list the clipboard probe uses.
const CLAIM = /(copied|saved|sent|shared|updated|added|removed|posted|submitted|uploaded|downloaded|done|success)/i;

let grand = 0;
const rows = [];
for (const f of FILES) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }
  for (const s of SURFACES) {
    s.re.lastIndex = 0;
    let m;
    while ((m = s.re.exec(src))) {
      grand++;
      // The handler this sits in. 320 chars covers these dense one-liners without spilling into
      // the next control — the window the clipboard probe was calibrated on.
      const scope = src.slice(m.index, m.index + 320);
      const claims = CLAIM.test(scope);
      // "Guarded" does not look the same for every surface, and the first run of this probe got
      // that wrong: it tested for .then/.catch/await/try and reported 3 of the 4 geolocation
      // calls as unguarded. geolocation is CALLBACK-style — its error handler is the SECOND
      // ARGUMENT, and all four supply one. A promise test applied to a callback API reports a
      // defect that is not there, which is the fifth too-narrow proxy this session.
      const guarded = EVENT_ERR.has(s.name)
        ? /onerror\s*=/.test(src.slice(m.index, m.index + 900))
        : CALLBACK_ERR.has(s.name)
        ? topLevelArgs(src, src.indexOf("(", m.index + m[0].length - 1)) >= 2
        : /\.then\s*\(|\.catch\s*\(|await\s|try\s*\{/.test(src.slice(Math.max(0, m.index - 120), m.index + 320));
      rows.push({ file: f, surface: s.name, line: src.slice(0, m.index).split("\n").length,
        claims, guarded, note: s.note,
        text: scope.slice(0, 110).replace(/\s+/g, " ") });
    }
  }
}

const bySurface = new Map();
for (const r of rows) {
  if (!bySurface.has(r.surface)) bySurface.set(r.surface, []);
  bySurface.get(r.surface).push(r);
}

console.log(`${grand} write(s) outside lib/db.js across ${FILES.length} file(s)\n`);
console.log(`${"surface".padEnd(22)} ${"n".padStart(4)}  ${"claims success".padStart(15)}  ${"unguarded".padStart(10)}`);
for (const [name, list] of [...bySurface].sort((a, b) => b[1].length - a[1].length)) {
  const c = list.filter(x => x.claims).length, u = list.filter(x => !x.guarded).length;
  console.log(`${name.padEnd(22)} ${String(list.length).padStart(4)}  ${String(c).padStart(15)}  ${String(u).padStart(10)}`);
}

const risky = rows.filter(r => r.claims && !r.guarded);
console.log(`\n${risky.length} site(s) announce success with no visible guard:`);
for (const r of risky) {
  console.log(`\n  ${r.file}:${r.line}  [${r.surface}]`);
  console.log(`    ${r.text}`);
  console.log(`    (${r.note})`);
}
if (!risky.length) console.log("  (none)");
console.log("\nReport only. A guarded call may still lie, and an unguarded one may be genuinely");
console.log("fire-and-forget — read the site. The point is the SURFACES check:writes cannot see.");

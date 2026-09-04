#!/usr/bin/env node
// A climber's "Show my real name publicly" choice must survive `useProfilesByIds`.
//
// `0175` made that switch real: `profiles.show_name` persists and `pubName(p)` honours it —
// `p.showName && p.name ? p.name : "@"+username`. A recent sweep unified the friends list and the
// crew roster on `pubName` for exactly that reason.
//
// BUT `useProfilesByIds` hands back RAW postgrest rows: `select("id, name, avatar, show_name")`.
// Two things follow, and they are wrong in OPPOSITE directions:
//
//   1. `pubName(row)` reads `row.showName` — camelCase — which is undefined on a raw row. So a
//      climber who turned the setting ON is still shown as a handle. The INBOX does this.
//   2. …and `username` is not selected at all, so pubName's fallback derives a handle from the
//      REAL NAME (`"Robin Belay"` -> `@robinbelay`), which need not be their actual handle.
//   3. A consumer that skips pubName and reads `.name` shows the real name whatever the setting
//      says. `vouchRowsFrom` does this — and FullProfile builds ANOTHER climber's vouch rows with
//      it, so every voucher's real name is rendered on somebody else's profile.
//
// The fix is at the boundary: select `username` too, and expose `showName` beside the raw
// `show_name` (additive — nothing reading the snake_case field breaks). Then vouch rows go
// through pubName like every other name surface.
//
//   node scripts/oneoff/probe-profiles-by-ids-name-gate.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `export { pubName, vouchRowsFrom } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pubname-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { pubName, vouchRowsFrom } = require_(out);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");

// ---- 1. THE HOOK MUST SELECT WHAT pubName NEEDS. Without `username`, pubName derives a handle
// from the real name, which is not the climber's handle.
const sel = db.match(/from\("profiles"\)\.select\("([^"]*)"\)\.in\("id", ids\)/);
if (!sel) fail("ANCHOR LOST: useProfilesByIds' select could not be read");
else {
  const cols = sel[1].split(",").map((c) => c.trim());
  for (const need of ["id", "name", "avatar", "show_name", "username"]) {
    if (cols.includes(need)) ok(`useProfilesByIds selects ${need}`);
    else fail(`useProfilesByIds does not select ${need} — pubName cannot do its job`);
  }
}

// ---- 2. …and must expose it in the shape pubName reads. `show_name` is snake_case; pubName reads
// `showName`. A raw row therefore never honours an ON setting.
if (/showName:\s*!!p\.show_name/.test(db)) ok("useProfilesByIds maps show_name -> showName");
else fail("useProfilesByIds returns raw rows — pubName sees showName undefined on every one");

// The snake_case field must SURVIVE, or a consumer reading p.show_name breaks silently.
if (/\.\.\.p,/.test(db) || /show_name:\s*p\.show_name/.test(db))
  ok("...additively, so anything reading show_name still works");
else fail("the raw show_name field was dropped — this is not an additive change");

// ---- 3. pubName's own contract, executed. These are the two directions the mapping enables.
const on = { id: "u1", name: "Robin Belay", username: "robinb", showName: true };
const off = { id: "u2", name: "Robin Belay", username: "robinb", showName: false };
if (pubName(on) === "Robin Belay") ok("pubName shows the real name when the climber chose to");
else fail(`pubName(showName:true) = ${JSON.stringify(pubName(on))}`);
if (pubName(off) === "@robinb") ok("pubName shows the stored handle when they did not");
else fail(`pubName(showName:false) = ${JSON.stringify(pubName(off))}`);

// The failure this fix removes: a raw row can never say yes, and invents a handle.
const raw = { id: "u3", name: "Robin Belay", show_name: true };
if (pubName(raw) !== "Robin Belay") ok("a RAW row still cannot honour the setting (which is why the hook maps it)");
else fail("a raw row now resolves — the premise of this probe has changed, re-read it");

// ---- 4. VOUCH ROWS GO THROUGH THE GATE. FullProfile builds ANOTHER climber's vouch rows with
// vouchRowsFrom, so a bare `.name` here publishes every voucher's real name on somebody's profile.
const rows = [{ from_id: "u2", reason: JSON.stringify({ text: "Solid partner." }), created_at: "2026-08-01T00:00:00Z" }];
const hidden = vouchRowsFrom(rows, [{ id: "u2", name: "Robin Belay", username: "robinb", showName: false }]);
if (hidden[0].from === "@robinb") ok("a voucher who hid their name renders as their handle");
else fail(`a voucher who hid their name renders as ${JSON.stringify(hidden[0].from)}`);

const shown = vouchRowsFrom(rows, [{ id: "u2", name: "Robin Belay", username: "robinb", showName: true }]);
if (shown[0].from === "Robin Belay") ok("...and one who chose to show it still gets their name");
else fail(`a voucher who shows their name renders as ${JSON.stringify(shown[0].from)}`);

// ---- 5. The MISSING-author fallback must survive — a vouch from someone whose profile did not
// load must not vanish or print undefined.
const none = vouchRowsFrom(rows, []);
if (none[0].from === "A ClimbMatch member") ok("a vouch whose author did not load still says so");
else fail(`a missing author renders as ${JSON.stringify(none[0].from)}`);
if (none.length === 1) ok("...and the vouch itself is not dropped");
else fail("a vouch with an unresolved author disappeared");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);

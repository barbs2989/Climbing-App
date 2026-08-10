// Vite config used only by check:anniversary.
//
// Climb anniversaries are DATE-GATED: `_anniv` fires only for a log whose yearly anchor is
// within two days of today. The seed logbook has one entry, dated 2026-05-24, so on all but
// ~5 days of the year the feature renders NOTHING -- and every render guard walks the app on
// one of the other 360. That is why #713 could revive it and no check could see it.
//
// So this injects a log dated EXACTLY ONE YEAR AGO TODAY, computed at config load, and the
// check then asserts the anniversary notification reaches the screen.
//
// The injected entry is a CLONE OF THE SEED ENTRY with only its date rewritten, lifted out of
// the source rather than hand-written here. A hand-written literal would be a second copy of
// a shape that lives somewhere else: add a field to the seed log and the clone silently stops
// matching it, and `logs` feeds Resume, TickList and _pastClimbs as well as _anniv. Deriving
// it means the probe is always shaped like the real thing.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, lazyChunks } from "./lib/overlay-scaffold.mjs";

const OPENER_ANCHOR = "  const prevUidRef=useRef(uid);";
const LOGS_ANCHOR = "[logs,setLogs]=useState([";

// One year ago today, as YYYY-MM-DD in LOCAL time.
//
// Local, not UTC: `_anniv` builds its anchor with `new Date(y, m, d)` and compares against
// `new Date()`, both local, so a UTC-derived date would be a day off for anyone west of
// Greenwich for part of the day -- and the gate is +/- 2 days, so it would still pass and
// quietly prove less than it claims.
//
// Feb 29 needs no special case: "2025-02-29T12:00:00" parses to Mar 1, so the anchor lands
// one day off todayand the +/- 2 day window still catches it.
export function oneYearAgoISO(now = new Date()) {
  const y = now.getFullYear() - 1;
  const p = (n) => String(n).padStart(2, "0");
  return `${y}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Pull the first seed log entry out of the source by balancing braces.
//
// Over RAW source, and skipping string contents. Not the comment/string blanker the static
// guards use: that treats every quote as a delimiter, and this app's prose is full of
// apostrophes, so it desynchronises and swallows braces (the lesson check:overlay-discovery
// records). Here the opposite care is needed -- a brace INSIDE a string literal must not be
// counted, or the walk ends in the wrong place.
export function firstLogEntry(code) {
  const at = code.indexOf(LOGS_ANCHOR);
  if (at < 0) return null;
  const start = at + LOGS_ANCHOR.length;
  let depth = 0, str = null;
  for (let i = start; i < code.length; i++) {
    const c = code[i];
    if (str) { if (c === "\\") { i++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return { start, end: i + 1, text: code.slice(start, i + 1) }; }
  }
  return null;
}

function anniversaryScaffold() {
  return {
    name: "anniversary-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      if (!id.endsWith("/ClimbMatch.jsx")) return null;

      const n = code.split(OPENER_ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + OPENER_ANCHOR +
          "\nbut found " + n + ". Without the opener the notifications overlay never mounts, so " +
          "this check would look at a bare tab and report green over nothing. Update the anchor " +
          "in scripts/anniversary.config.mjs."
        );
      }
      const logsCount = code.split(LOGS_ANCHOR).length - 1;
      if (logsCount !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + LOGS_ANCHOR +
          "\nbut found " + logsCount + ". Without it no dated log is injected, no anniversary can " +
          "fire, and this check would fail as though the feature were broken. Update the anchor " +
          "in scripts/anniversary.config.mjs."
        );
      }
      const seed = firstLogEntry(code);
      if (!seed) throw new Error("anniversary scaffold: could not balance the first seed log entry — the injected probe would not be shaped like a real log.");
      const dated = seed.text.replace(/date:\s*"\d{4}-\d{2}-\d{2}"/, `date:"${oneYearAgoISO()}"`);
      if (dated === seed.text) {
        throw new Error('anniversary scaffold: the seed log entry has no `date:"YYYY-MM-DD"` field to rewrite, so the injected entry would carry the ORIGINAL date and no anniversary could fire.');
      }

      const { inject } = buildOpener(code, OPENER_ANCHOR, "check:anniversary");
      let out = code.replace(OPENER_ANCHOR, OPENER_ANCHOR + "\n  " + inject);
      // Prepend the dated clone. Splicing by string keeps this readable and the anchor count
      // above already proved it appears exactly once.
      out = out.replace(LOGS_ANCHOR, LOGS_ANCHOR + dated + ",");
      return out;
    },
  };
}

const WARM = lazyChunks("check:anniversary");
console.log("check:anniversary — injecting a log dated " + oneYearAgoISO() + "; warming " + WARM.length + " lazy chunk(s)");

export default {
  ...base,
  plugins: [anniversaryScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};

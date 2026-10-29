#!/usr/bin/env node
// check:tap-slop — a touch just off a small control still reaches it, and nothing quietly undoes that.
//
// Owner note (2026-10-28): "Some clicks links are small". A walk of 100 screens measured 1,051
// controls with a side under 44px (Apple's minimum; Material asks 48dp), most of them the 29px
// section toggles and chips on the route page. lib/tapSlop.js widens each one's TOUCH area to
// 44px without redrawing anything: a touch on nothing goes to the nearest small control whose
// 44px box holds it. Notes: docs/guards/static-code.md (check:tap-slop).
//
// The behaviour lives in a single module-scope call and one listener, so it can disappear in a
// one-line diff and every screen would still render exactly as before -- nothing visible breaks,
// taps just start missing again. This reads the source for the pieces that make it work AND the
// refusals that keep it from stealing taps:
//   1. main.jsx imports installTapSlop and calls it at module scope (not behind a flag);
//   2. TAP_MIN is still 44;
//   3. the listener is capture-phase (true) -- React's root listener would otherwise see the
//      stray tap first and a backdrop would close instead;
//   4. it acts on a touch or a pen only, and never on a click with detail 0 (Enter/Space, or its
//      own forwarded click);
//   5. a tap that HIT something tappable is left alone (onTappable), and a tie goes to nobody.
//
// Blind to: whether the forwarding feels right on a real phone -- scripts/oneoff/probe-tap-targets.mjs
// measures each control's reach after the widening, in Chrome, across the same screens check:axe walks.
import fs from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (f) => { try { return fs.readFileSync(ROOT + f, "utf8"); } catch { console.error(`check:tap-slop: cannot read ${f}`); process.exit(1); } };
const main = read("main.jsx"), slop = read("lib/tapSlop.js");
const fails = [];
const need = (ok, what) => { if (!ok) fails.push(what); };

need(/^import \{ installTapSlop \} from "\.\/lib\/tapSlop\.js";$/m.test(main), "main.jsx no longer imports installTapSlop from ./lib/tapSlop.js");
need(/^installTapSlop\(\);$/m.test(main), "main.jsx no longer calls installTapSlop() at module scope (a column-0 statement)");
need(/export const TAP_MIN = 44;/.test(slop), "TAP_MIN is no longer 44 (Apple's minimum touch target)");
const install = slop.slice(slop.indexOf("export function installTapSlop"));
need(/addEventListener\("click",[\s\S]*?\},\s*true\);/.test(install), "the click listener is no longer capture-phase");
need(/pointerType === "touch"/.test(install) && /if \(!touch \|\| e\.detail === 0/.test(install), "the click listener no longer refuses a mouse, a keyboard click, or its own forwarded click");
need(/if \(!hit \|\| onTappable\(hit\)\) return null;/.test(slop), "slopTarget no longer leaves a tap that hit something tappable alone");
need(/return tie \|\| !bestReaches \? null : best;/.test(slop), "slopTarget no longer refuses a tie, or a touch a bigger control is nearer to");

if (fails.length) { console.log(`check:tap-slop FAILED:\n${fails.map((f) => "  " + f).join("\n")}`); process.exit(1); }
console.log("check:tap-slop OK — small controls keep their 44px touch area, and the refusals that stop it stealing taps are intact.");

// Every `position:fixed` element is anchored to the VIEWPORT, not to the app's 520px column, so on
// a desktop monitor it renders somewhere a phone never puts it. check:overlay-width-cap covers the
// 23 OPAQUE FULL-SCREEN VIEWS. This asks the same question of ALL of them, and classifies the rest.
import fs from "node:fs";
const FILES = ["ClimbMatch.jsx","ClimbMatchCore.jsx","RouteDetail.jsx",
  ...fs.readdirSync("lib").filter(f=>f.endsWith(".jsx")).map(f=>"lib/"+f)];
function objectAround(src, at) {
  let i = at;
  while (i > 0 && src[i] !== "{") i--;
  let d = 0, q = null, j = i;
  for (; j < src.length; j++) {
    const c = src[j], p = src[j-1];
    if (q) { if (c === q && p !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") d++;
    else if (c === "}") { d--; if (!d) return src.slice(i, j+1); }
  }
  return null;
}
const rows = [];
for (const f of FILES) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/position: *["']fixed["']/g)) {
    const line = src.slice(0,m.index).split("\n").length;
    const o = objectAround(src, m.index);
    if (!o) { rows.push({f, line, kind:"UNPARSED", o:""}); continue; }
    const capped = /maxWidth\s*:\s*520/.test(o) && /margin\s*:\s*["']0 auto["']/.test(o);
    const fullBleed = /inset\s*:\s*0/.test(o) || (/left\s*:\s*0/.test(o) && /right\s*:\s*0/.test(o));
    const scrim = /background\s*:\s*["'`]?rgba\(0, ?0, ?0/.test(o);
    const centred = /left\s*:\s*["']50%["']/.test(o) && /translateX\(-50%\)/.test(o);
    const narrow = /maxWidth\s*:\s*(\d+)/.exec(o);
    let kind;
    if (capped) kind = "CAPPED";
    else if (scrim) kind = "SCRIM";
    else if (centred && narrow && +narrow[1] <= 520) kind = "CENTRED-NARROW";
    else if (fullBleed) kind = "FULL-BLEED";
    else kind = "OTHER";
    rows.push({f, line, kind, o: o.replace(/\s+/g," ").slice(0,170)});
  }
}
const by = {};
for (const r of rows) (by[r.kind] ||= []).push(r);
console.log("fixed-position elements: " + rows.length + "\n");
for (const k of Object.keys(by).sort()) console.log("  " + k.padEnd(16) + by[k].length);
console.log("\n--- FULL-BLEED / OTHER / UNPARSED (could render outside the column) ---");
for (const r of [...(by["FULL-BLEED"]||[]), ...(by["OTHER"]||[]), ...(by["UNPARSED"]||[])]) {
  console.log("\n" + r.kind + "  " + r.f + ":" + r.line);
  console.log("   " + r.o);
}

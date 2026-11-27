// Same census as census.mjs, read from the nightly static snapshot (<pages>/states/*.json.gz) — no DB slot.
// Usage: node census-snapshot.mjs <dir with the downloaded .json.gz parts>
import fs from "node:fs"; import zlib from "node:zlib"; import path from "node:path";
import { pitchEntryKind } from "../../../lib/breakdownRows.js";
const dir = process.argv[2];
const DISCS = new Set(["mountaineering", "alpine", "ice", "mixed", "snow", "glacier", "scrambling"]);
const RAP = /\b(rappel|rap|raps|abseil|down-?climb|lower(?:ing)?)\b/i;
const ICE = /\b(ice|icefall|ice step|ice pitch|ice chute|water ice|alpine ice|bergschrund|serac|steep snow|snow step|snow pitch|neve|névé)\b/i;
const out = { A1: [], A2: [], B: [], scanned: 0 };
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json.gz"))) {
  const buf = fs.readFileSync(path.join(dir, f)); let j; try { j = JSON.parse(buf[0] === 0x1f ? zlib.gunzipSync(buf) : buf); } catch (e) { console.error("skip", f, e.message); continue; }
  const rows = (j.routes || []).filter((r) => DISCS.has(r.discipline) && (r.pitch_detail || r.waypoints));
  for (const r of rows) {
    out.scanned++;
    const route = { discipline: r.discipline };
    const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
    pd.forEach((p, i) => {
      if (!p) return;
      const k = pitchEntryKind(p, route);
      const lbl = String(p.pitch ?? p.n ?? p.label ?? p.name ?? "");
      const txt = lbl + " | " + (p.grade || "") + " | " + (p.note || p.notes || p.desc || "");
      if (k === "pitch" && RAP.test(lbl + " " + (p.grade || ""))) out.A1.push({ st: j.state, id: r.id, name: r.name, d: r.discipline, pitches: r.pitches, i, lbl, grade: p.grade, anchor: p.anchor });
      if (k === "stage" && ICE.test(lbl + " " + (p.grade || "")) && !/approach|trail|camp|descent|descend/i.test(lbl)) out.A2.push({ st: j.state, id: r.id, name: r.name, d: r.discipline, ice: r.ice_grade, pitches: r.pitches, i, txt: txt.slice(0, 220) });
    });
    const wp = Array.isArray(r.waypoints) ? r.waypoints.filter((w) => w && typeof w.distMi === "number") : [];
    if (wp.length >= 2) {
      const max = Math.max(...wp.map((w) => w.distMi));
      const oneWayMi = r.dist_km ? r.dist_km / 1.609344 : null;
      const back = wp.some((w, k) => k && w.distMi < wp[k - 1].distMi - 0.05);
      const rt = oneWayMi && max > oneWayMi * 1.7 && max < oneWayMi * 2.3;
      if (rt || back) out.B.push({ st: j.state, id: r.id, name: r.name, d: r.discipline, oneWayMi: oneWayMi && +oneWayMi.toFixed(2), max, back, rt: !!rt, pins: wp.map((w) => [w.name, w.type, w.distMi]) });
    }
  }
}
fs.mkdirSync("research-data/glacier-pitch-sweep", { recursive: true });
fs.writeFileSync("research-data/glacier-pitch-sweep/census.json", JSON.stringify(out, null, 1));
console.log("scanned", out.scanned, "A1", out.A1.length, "A2", out.A2.length, "B", out.B.length, "B-back", out.B.filter(b=>b.back).length, "B-rt", out.B.filter(b=>b.rt).length);

import fs from "fs";
const dir = new URL("./chunks2/", import.meta.url);
const inp = JSON.parse(fs.readFileSync(new URL("in-0.json", dir)));
const PROPER = ["American", "Canadian", "Klawatti-Austera", "Chianti-Pernod", "Burgundy", "Stuart", "Sherpa", "Argonaut", "Kennedy", "Kololo Peaks", "Fryingpan", "Richardson", "Luahna", "British Columbia", "Shuksan", "Lexington", "Tepeh Towers", "Cannonhole", "Sperry"];
const byLower = new Map(PROPER.map(p => [p.toLowerCase(), p]));
const out = inp.map(r => {
  let s = byLower.get(r.run.toLowerCase()) || r.run.toLowerCase();
  if (/(^|[.!?]\s+|\n\s*)$/.test(r.before)) s = s[0].toUpperCase() + s.slice(1);
  return { k: r.k, run: s };
});
fs.writeFileSync(new URL("out-0.json", dir), JSON.stringify(out));
console.log(out.filter((o, i) => o.run !== inp[i].run.toLowerCase()).map(o => o.run).join(" | "));

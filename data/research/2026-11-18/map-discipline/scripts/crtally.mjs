import fs from "fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const d = JSON.parse(fs.readFileSync("picklist-data.json", "utf8")).filter(r => /^ca_|^nv_/.test(r.id));
const usfs = JSON.parse(fs.readFileSync("usfs-trailheads.json", "utf8")).filter(t => t.lat > 35 && t.lat < 39.5 && t.lng < -117.5 && t.lng > -120.5);
const idx = {}; const get = async (u, f) => { if (fs.existsSync(f)) return fs.readFileSync(f, "utf8"); await sleep(1200); const t = await (await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(40000) })).text(); fs.writeFileSync(f, t); return t; };
const key = p => p.toLowerCase().replace(/^mount |^mt\.? /, "").replace(/ (mountain|mtn|peak|pk|mt)$/, "").replace(/[^a-z]/g, "");
const out = {};
for (const peak of [...new Set(d.map(r => r.p))]) {
  const k = key(peak); const L = k[0].toUpperCase();
  idx[L] ||= await get(`https://climber.org/reports/ByPeak${L}.html`, `cr/ByPeak${L}.html`);
  const s = idx[L]; const i = s.indexOf(`name="${k}"`); if (i < 0) { out[peak] = { err: "no index " + k }; continue; }
  const blk = s.slice(i, s.indexOf('<a name="', i + 10) > 0 ? s.indexOf('<a name="', i + 10) : i + 20000);
  const reps = [...blk.matchAll(/href="\.\.\/reports\/(\d{4})\/(\d+)\.html"/g)].map(m => `${m[1]}/${m[2]}`);
  out[peak] = { reports: [] };
  for (const r of [...new Set(reps)].slice(0, 25)) {
    const t = (await get(`https://climber.org/reports/${r}.html`, `cr/${r.replace("/", "_")}.html`)).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
    const ths = [...t.matchAll(/((?:[A-Z][A-Za-z.']+ ){1,3})(?:Trailhead|trailhead|TH)\b/g)].map(m => m[1].trim()).filter(x => !/^(The|A|At|From|To|Our|We|Back|Return|This)$/.test(x));
    const hits = usfs.filter(u => { const n = u.name.replace(/ (Trailhead|TH|Trail Head)$/i, ""); return n.length > 4 && t.toLowerCase().includes(n.toLowerCase()); }).map(u => u.name);
    out[peak].reports.push({ r, ths: [...new Set(ths)].slice(0, 6), usfs: [...new Set(hits)].slice(0, 6) });
  }
  console.log("##", peak, "| reports", out[peak].reports.length);
  for (const x of out[peak].reports) console.log("   ", x.r, "| named:", x.ths.join("; "), "| usfs:", x.usfs.join("; "));
}
fs.writeFileSync("crtally.json", JSON.stringify(out, null, 1));

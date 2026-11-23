import fs from "fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const audit = JSON.parse(fs.readFileSync("audit-r12.json", "utf8"));
const open = new Set(audit.findings.filter(f => f.verdict === "SUMMIT_ONLY").map(f => f.id));
const d = JSON.parse(fs.readFileSync("picklist-data.json", "utf8")).filter(r => /^ca_/.test(r.id) && open.has(r.id) && r.id !== "ca_spanish_mountain_north_ridge");
const get = async (u, f) => { if (fs.existsSync(f)) return fs.readFileSync(f, "utf8"); await sleep(1200); const t = await (await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(40000) })).text(); fs.writeFileSync(f, t); return t; };
const key = p => p.toLowerCase().replace(/^mount |^mt\.? /, "").replace(/ (mountain|mtn|peak|pk|mt)$/, "").replace(/[^a-z]/g, "");
const idx = {}; const out = {};
for (const row of d) {
  const peak = row.p; const k = key(peak); const L = k[0].toUpperCase();
  idx[L] ||= await get(`https://climber.org/reports/ByPeak${L}.html`, `cr/ByPeak${L}.html`);
  const s = idx[L]; const i = s.indexOf(`name="${k}"`); if (i < 0) { console.log("##", peak, "no index"); continue; }
  const nx = s.indexOf('<a name="', i + 10); const blk = s.slice(i, nx > 0 ? nx : i + 20000);
  const reps = [...new Set([...blk.matchAll(/reports\/(\d{4})\/(\d+)\.html/g)].map(m => `${m[1]}/${m[2]}`))];
  const res = [];
  for (const r of reps.slice(0, 30)) {
    const t = (await get(`https://climber.org/reports/${r}.html`, `cr/${r.replace("/", "_")}.html`)).replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ");
    const peaks = (t.match(/Peaks:\s*([^\n]*)/) || [])[1] || ""; const n = peaks.split(",").filter(Boolean).length;
    const th = ((t.match(/Trailhead:\s*([^\n]*)/) || [])[1] || "").trim();
    const flat = t.replace(/\s+/g, " "); const sent = (flat.match(/[^.]{0,80}\b(trailhead|parked|trail head|road end|started (hiking|from|at))\b[^.]{0,80}/i) || [""])[0].trim();
    res.push({ r, n, th, sent: sent.slice(0, 170) });
  }
  out[row.id] = { peak, res };
  console.log("\n##", row.id, "|", peak, "|", res.length, "reports");
  for (const x of res.filter(x => x.n <= 3)) console.log("   ", x.r, `peaks=${x.n}`, "| TH:", x.th || "-", "|", x.th ? "" : x.sent);
}
fs.writeFileSync("cr2.json", JSON.stringify(out, null, 1));

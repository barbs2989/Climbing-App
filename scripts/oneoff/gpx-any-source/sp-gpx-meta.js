// SummitPost GPX metadata — paste on the SAME robots.txt tab after sp-harvester.js finishes (window.__SP holds
// the harvest). For every GPX file it found, downloads ONE file, sp-<ST>-meta.json:
//   { "<f>": { date, n, nt, distinct, spanH, mono, creator } }
// date = the FIRST TRACK POINT's day (never <metadata>, which is the export date). Nothing here is ever written
// to the database: date feeds only the season rule, the rest the recorded-or-drawn test in sp-to-harvest.mjs.
// Split it for sp-to-harvest.mjs:  dates2 = {f: date},  recorded = the whole map (it ignores `date`).
const ST = "wa";
(async () => {
  const ids = [...new Set(window.__SP.out.filter(r => r.found).flatMap(r => [...(r.gpx || []), ...(r.routes || []).flatMap(x => x.gpx || [])]).map(g => g.f))];
  const meta = {};
  for (const f of ids) {
    const t = await (await fetch(`/download.php?f=${f}.gpx`, { credentials: "include" })).text();
    const pts = [...t.matchAll(/<trkpt[\s\S]*?<\/trkpt>|<rtept[\s\S]*?<\/rtept>/g)].map(m => m[0]);
    const times = pts.map(p => (p.match(/<time>([^<]+)<\/time>/) || [])[1]).filter(Boolean);
    const ms = times.map(s => Date.parse(s));
    meta[f] = {
      date: times.length ? times[0].slice(0, 10) : "", n: pts.length, nt: ms.length, distinct: new Set(ms).size,
      spanH: ms.length ? +((Math.max(...ms) - Math.min(...ms)) / 36e5).toFixed(1) : 0,
      mono: ms.every((x, i) => i === 0 || x >= ms[i - 1]), creator: ((t.match(/creator="([^"]{0,40})/) || [])[1] || ""),
    };
    await new Promise(z => setTimeout(z, 800));
  }
  window.__SPMETA = meta;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(meta)], { type: "application/json" }));
  a.download = `sp-${ST}-meta.json`; document.body.appendChild(a); a.click(); a.remove();
})();
"meta started";

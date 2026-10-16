// Builds pb/in/p1..p4.json: every item and fill the one-source pass (single/out/s1-s6) left unresolved,
// carrying that pass's summary/evidence, grouped by route so one agent owns all of a route's items.
import fs from "node:fs";
const base = "audits/route-leftovers/single";
fs.mkdirSync("audits/route-leftovers/pb/in", { recursive: true });
fs.mkdirSync("audits/route-leftovers/pb/out", { recursive: true });
const groups = new Map();
for (const b of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
  const inp = JSON.parse(fs.readFileSync(`${base}/in/${b}.json`, "utf8"));
  const fills = [...(inp.fills || [])];
  for (const r of JSON.parse(fs.readFileSync(`${base}/out/${b}.json`, "utf8")).results) {
    if (r.verdict !== "unresolved") continue;
    const last = `${r.summary} ${r.evidence || ""}`.trim();
    let entry;
    if (r.kind === "fill") {
      const i = fills.findIndex(f => f.id === r.id && f.column === r.fact);
      const f = i >= 0 ? fills.splice(i, 1)[0] : { id: r.id, column: r.fact };
      entry = { kind: "fill", ...f, prior_evidence: last };
    } else {
      const it = (inp.items || []).find(x => x.id === r.id && x.fact === r.fact) || { id: r.id, fact: r.fact };
      entry = { kind: "item", id: it.id, fact: it.fact, prior_file: it.prior_file, prior_evidence: last };
    }
    if (!groups.has(r.id)) groups.set(r.id, []);
    groups.get(r.id).push(entry);
  }
}
const N = 4, out = Array.from({ length: N }, () => []);
for (const g of [...groups.values()].sort((a, b) => b.length - a.length)) out.sort((a, b) => a.length - b.length)[0].push(...g);
out.forEach((list, i) => fs.writeFileSync(`audits/route-leftovers/pb/in/p${i + 1}.json`,
  JSON.stringify({ items: list.filter(x => x.kind === "item"), fills: list.filter(x => x.kind === "fill") }, null, 1)));
console.log(out.map(l => l.length), groups.size);

// Is "not in GNIS" true, or is the SWEEP deaf again?
//
// solve-selfcontradicting.mjs refused 8 of 9 pins for the same reason. A uniform refusal reason is
// the exact tell that hid the layer-5 geometry bug (which produced "(not in GNIS)" for 25 names
// that were there) and the case-sensitive LIKE bug. So this asks the WEAKEST possible question —
// UPPER(gaz_name) LIKE '%TOKEN%' across every layer the service publishes — rather than the exact
// name on four layers. If the weak question also comes back empty, the refusal is about the data.
//
// UPPER() on both sides: ArcGIS LIKE is case-sensitive, and normalising only one side is how 25
// names were wrongly reported missing.
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";

async function layers() {
  const r = await fetch(`${GNIS}?f=json`, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("layer list " + r.status);
  const j = await r.json();
  return (j.layers || []).map(l => ({ id: l.id, name: l.name }));
}

async function like(layer, token) {
  const where = `UPPER(gaz_name) LIKE UPPER('%${token.replace(/'/g, "''")}%') AND state_alpha='WA'`;
  const u = `${GNIS}/${layer}/query?where=${encodeURIComponent(where)}`
    + `&outFields=gaz_name,gaz_featureclass,county_name&returnGeometry=true&outSR=4326&f=json&resultRecordCount=25`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        const j = await r.json();
        if (j.error) return { err: j.error.message || String(j.error.code) };
        return { hits: (j.features || []).map(f => f.attributes) };
      }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 700 * (t + 1)));
  }
  return { err: "no answer after 3 attempts" };
}

const LS = await layers();
console.log(`GNIS publishes ${LS.length} layers: ${LS.map(l => l.id + "=" + l.name).join(", ")}`);
/* A GROUP layer ("expand for more") holds no features of its own and answers a query with
   "Invalid or missing input parameters"; layer 8 is Antarctica and has no state_alpha. Those errors
   are the service saying "wrong question", NOT "nothing found" — and a reader who mistakes them for
   a failed sweep would wrongly distrust the refusals below. Their CHILDREN are queried and are
   where the features live: 1/2/3 under Places, 5/6/7 under Physical Points, 12/13/14 under
   Historical Points. This is the group-layer trap that has already produced one false negative in
   this repo. */
const GROUP = new Set([0, 4, 9, 11, 8]);
console.log(`  queryable: ${LS.filter(l => !GROUP.has(l.id)).map(l => l.id).join(",")}   `
  + `group/no-state (cannot be asked, and that is not a miss): ${[...GROUP].sort((a, b) => a - b).join(",")}\n`);

// CONTROL — a token that MUST be found, through this exact weak path. Without it an empty sweep and
// a broken query are the same output.
const ctl = [];
for (const l of LS) { if (GROUP.has(l.id)) continue; const r = await like(l.id, "Olympus"); if (r.hits?.length) ctl.push(`${l.id}:${r.hits.length}`); }
if (!ctl.length) { console.log("CONTROL FAILED — 'Olympus' matched nothing on any layer. The query is broken, not the data."); process.exit(1); }
console.log(`CONTROL  'Olympus' -> ${ctl.join(" ")}\n`);

const TOKENS = ["Summerland", "Jotunheim", "Whine Spire", "Ice Box", "Slippery Slab", "Pinto Rock"];
for (const tok of TOKENS) {
  const found = [];
  for (const l of LS) {
    if (GROUP.has(l.id)) continue;
    const r = await like(l.id, tok);
    // A real error on a QUERYABLE layer must not read as "nothing found" — that is the whole point.
    if (r.err) { found.push(`layer ${l.id} ${l.name}: ERROR ${r.err} — NOT a miss, the layer did not answer`); continue; }
    for (const h of r.hits) found.push(`${h.gaz_name} [${h.gaz_featureclass}, ${h.county_name}] (layer ${l.id} ${l.name})`);
  }
  console.log(`${tok}`);
  if (!found.length) console.log("    nothing in WA on any layer");
  else for (const f of [...new Set(found)]) console.log("    " + f);
}

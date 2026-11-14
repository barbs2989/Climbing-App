// The research ledger's rules: when a researched route field may LOCK, and whether a write would
// overwrite a locked one. Pure functions (no network) so they can be self-tested; the writer is
// enrich:apply (scripts/enrich-approach-rappel-bivy.mjs), the table is route_field_evidence (0437),
// the owner's rules are in .claude/skills/route-research/ (SKILL.md and disciplines.md).
//
//   node scripts/lib/research-ledger.mjs --selftest
//
// A batch entry may carry `ledger: [ {field, value, method, level, evidence:[...], expires_at?} ]`
// and `overturn: { <field>: [evidence...] }` to replace a locked value. Evidence items are
// {url, publisher?, retrieved_at, fact, official?: true, measurement?: "<how>"}.

export const METHODS = ["agree-2", "official-1", "measured", "single-source"]; // "owner" is not a batch method
export const LEVELS = ["locked", "locked-1src", "unconfirmed", "disputed"];
const LOCKED = new Set(["locked", "locked-1src"]);

// Publishers that are ONE source however many URLs a batch cites (owner, 2026-11-14: OpenBeta was
// built from Mountain Project; Hiking Project / Powder Project are Mountain Project's sister sites).
const SAME_PUBLISHER = {
  "openbeta.io": "mountainproject.com", "api.openbeta.io": "mountainproject.com",
  "hikingproject.com": "mountainproject.com", "powderproject.com": "mountainproject.com",
  "mtbproject.com": "mountainproject.com",
  "home.nps.gov": "nps.gov",
};
// Coordinates from these never count as evidence (owner, 2026-11-14: MP put Outer Space ~100 km off).
const NO_COORD_PUBLISHERS = new Set(["mountainproject.com"]);
// Fields that hold a position; a pin is "waypoints/<name>".
export const isCoordField = f => f === "lat" || f === "lng" || f === "approach_logistics" || f.startsWith("waypoints/");
// Never locked from one source (owner: MP alone may lock grade/length/bolts/rack, never coords or a first ascent).
const NEVER_SINGLE = f => isCoordField(f) || ["fa", "ffa", "fwa"].includes(f);

export function publisherOf(ev) {
  if (ev && ev.publisher) return String(ev.publisher).toLowerCase().replace(/^www\./, "");
  let host = "";
  try { host = new URL(ev.url).hostname.toLowerCase(); } catch { return null; }
  host = host.replace(/^www\./, "");
  if (SAME_PUBLISHER[host]) return SAME_PUBLISHER[host];
  // collapse subdomains of the same registrable name (fs.usda.gov stays itself; xyz.blogspot.com stays itself)
  const parts = host.split(".");
  const keep3 = /\.(gov|blogspot\.com|wordpress\.com|org\.uk|co\.uk)$/.test(host);
  const base = parts.slice(-(keep3 ? 3 : 2)).join(".");
  return SAME_PUBLISHER[base] || base;
}

export const distinctPublishers = evidence => new Set((evidence || []).map(publisherOf).filter(Boolean));

// Is this stored row a lock in force right now?
export function isActiveLock(row, now = new Date()) {
  if (!row || !LOCKED.has(row.level)) return false;
  return !row.expires_at || new Date(row.expires_at) > now;
}

// Validate one ledger entry a batch wants to write. Returns a list of problems (empty = ok).
export function validateEntry(e, now = new Date()) {
  const errs = [];
  const at = `ledger ${e && e.field ? e.field : "(no field)"}`;
  if (!e || typeof e !== "object") return [`${at}: not an object`];
  if (typeof e.field !== "string" || !/^[a-z_][a-z0-9_]*(\/.+)?$/.test(e.field)) errs.push(`${at}: field must be a routes column or "waypoints/<pin name>"`);
  if (!METHODS.includes(e.method)) errs.push(`${at}: method must be one of ${METHODS.join(", ")} (owner locks are not written by batches)`);
  if (!LEVELS.includes(e.level)) errs.push(`${at}: level must be one of ${LEVELS.join(", ")}`);
  if (!("value" in e)) errs.push(`${at}: value is required (null is allowed)`);
  const ev = Array.isArray(e.evidence) ? e.evidence : null;
  if (!ev) { errs.push(`${at}: evidence must be an array`); return errs; }
  ev.forEach((x, i) => {
    if (!x || typeof x !== "object") { errs.push(`${at}: evidence ${i + 1} is not an object`); return; }
    if (!x.measurement && !/^https?:\/\//.test(String(x.url || ""))) errs.push(`${at}: evidence ${i + 1} needs a url (or a "measurement" description)`);
    if (!String(x.fact || "").trim()) errs.push(`${at}: evidence ${i + 1} needs the fact as found`);
    if (String(x.fact || "").split(/\s+/).length > 25) errs.push(`${at}: evidence ${i + 1} fact is a sentence — store the fact (number, name), never the source's wording`);
  });
  const coord = isCoordField(e.field || "");
  const counted = coord ? ev.filter(x => x.measurement || !NO_COORD_PUBLISHERS.has(publisherOf(x))) : ev;
  if (coord && counted.length < ev.length) errs.push(`${at}: Mountain Project / OpenBeta coordinates are never evidence — remove them or record them as a lead elsewhere`);
  const pubs = distinctPublishers(counted.filter(x => !x.measurement));
  if (LOCKED.has(e.level)) {
    if (e.method === "agree-2" && e.level === "locked" && pubs.size + counted.filter(x => x.measurement).length < 2)
      errs.push(`${at}: agree-2 needs 2 independent publishers (has ${pubs.size}: ${[...pubs].join(", ") || "none"})`);
    if (e.method === "official-1") {
      if (!counted.some(x => x.official)) errs.push(`${at}: official-1 needs an evidence item marked official:true`);
      if (!e.expires_at) errs.push(`${at}: official-1 needs expires_at (12 months after retrieval)`);
      else if (new Date(e.expires_at) <= now) errs.push(`${at}: expires_at is already past`);
    }
    if (e.method === "measured" && !counted.some(x => x.measurement)) errs.push(`${at}: measured needs an evidence item with a "measurement" description`);
    if (e.method === "single-source") {
      if (e.level !== "locked-1src") errs.push(`${at}: single-source locks only at level locked-1src`);
      if (NEVER_SINGLE(e.field || "")) errs.push(`${at}: ${e.field} may never lock from a single source`);
      if (!counted.length) errs.push(`${at}: single-source needs one evidence item`);
    }
    if (e.level === "locked-1src" && e.method !== "single-source") errs.push(`${at}: level locked-1src is only for method single-source`);
  }
  return errs;
}

const sameValue = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]));
  return v === undefined ? null : v;
}
const pinKey = w => w && { name: w.name, lat: w.lat ?? null, lng: w.lng ?? null };

// Would writing `body` (routes column -> new value) change a field the ledger has locked?
// `rows` = this route's route_field_evidence rows; `overturn` = {field: [evidence...]} from the batch.
// Returns problems; a locked field written with its SAME value is fine.
export function lockViolations(body, rows, overturn = {}, now = new Date()) {
  const errs = [];
  for (const row of rows || []) {
    if (!isActiveLock(row, now)) continue;
    const [col, pin] = row.field.split(/\/(.*)/s);
    if (!(col in body)) continue;
    let next;
    if (pin !== undefined) {
      const found = (Array.isArray(body[col]) ? body[col] : []).find(w => w && w.name === pin);
      next = found ? pinKey(found) : null;
      if (sameValue(next, pinKey(row.value))) continue;
    } else {
      next = body[col];
      if (sameValue(next, row.value)) continue;
    }
    const need = row.level === "locked-1src" ? 2 : 3;
    const ev = overturn[row.field];
    const pubs = distinctPublishers((ev || []).filter(x => !(isCoordField(row.field) && NO_COORD_PUBLISHERS.has(publisherOf(x)))));
    if (pubs.size >= need) continue;
    errs.push(`${row.field} is LOCKED (${row.method}, ${row.level}) — the batch changes it with ${pubs.size} independent overturn source(s); ${need}+ are required, else leave it alone`);
  }
  return errs;
}

// The value the ledger must hold for a field, given what the row will contain after the write.
export function storedValueFor(field, finalRow) {
  const [col, pin] = field.split(/\/(.*)/s);
  if (pin === undefined) return finalRow[col] === undefined ? null : finalRow[col];
  const w = (Array.isArray(finalRow[col]) ? finalRow[col] : []).find(x => x && x.name === pin);
  return w ? pinKey(w) : undefined;
}
export const ledgerValueMatches = (entry, finalRow) => {
  const v = storedValueFor(entry.field, finalRow);
  if (v === undefined) return false;
  return entry.field.includes("/") ? sameValue(pinKey(entry.value), v) : sameValue(entry.value, v);
};

// The row to upsert, carrying history forward from the existing row.
export function nextLedgerRow(routeId, entry, existing, batch, now = new Date()) {
  const history = existing ? [...(existing.history || [])] : [];
  if (existing && !sameValue(existing.value, entry.value)) {
    history.push({ value: existing.value, method: existing.method, level: existing.level, evidence: existing.evidence, replaced_at: now.toISOString() });
  }
  return {
    route_id: routeId, field: entry.field,
    value: entry.field.includes("/") ? pinKey(entry.value) : (entry.value === undefined ? null : entry.value),
    method: entry.method, level: entry.level, evidence: entry.evidence,
    expires_at: entry.expires_at || null, history, batch: batch || null, set_at: now.toISOString(),
  };
}

// ── self-test ────────────────────────────────────────────────────────────────────────────────
function selftest() {
  let fail = 0;
  const t = (name, cond) => { if (!cond) { fail++; console.error("FAIL " + name); } else console.log("ok   " + name); };
  const now = new Date("2026-11-14T00:00:00Z");
  const mp = { url: "https://www.mountainproject.com/route/1", fact: "5.9" };
  const ob = { url: "https://openbeta.io/climbs/x", fact: "5.9" };
  const ck = { url: "https://climberkyle.com/a", fact: "5.9" };
  const nps = { url: "https://www.nps.gov/mora/x.htm", fact: "$82 per climb", official: true };
  t("MP and OpenBeta are one publisher", distinctPublishers([mp, ob]).size === 1);
  t("agree-2 with MP + OpenBeta is refused", validateEntry({ field: "grade", value: "5.9", method: "agree-2", level: "locked", evidence: [mp, ob] }, now).length > 0);
  t("agree-2 with MP + climberkyle passes", validateEntry({ field: "grade", value: "5.9", method: "agree-2", level: "locked", evidence: [mp, ck] }, now).length === 0);
  t("official-1 needs expires_at", validateEntry({ field: "permit", value: "x", method: "official-1", level: "locked", evidence: [nps] }, now).length > 0);
  t("official-1 with expiry passes", validateEntry({ field: "permit", value: "x", method: "official-1", level: "locked", evidence: [nps], expires_at: "2027-11-14T00:00:00Z" }, now).length === 0);
  t("single-source on grade passes at locked-1src", validateEntry({ field: "grade", value: "5.10a", method: "single-source", level: "locked-1src", evidence: [mp] }, now).length === 0);
  t("single-source never locks fa", validateEntry({ field: "fa", value: "x", method: "single-source", level: "locked-1src", evidence: [mp] }, now).length > 0);
  t("MP coordinates are refused", validateEntry({ field: "waypoints/Summit", value: { name: "Summit", lat: 1, lng: 2 }, method: "agree-2", level: "locked", evidence: [{ ...mp, fact: "1,2" }, { url: "https://www.openstreetmap.org/node/1", fact: "1,2" }] }, now).length > 0);
  t("USGS measurement + OSM locks a pin", validateEntry({ field: "waypoints/Summit", value: { name: "Summit", lat: 1, lng: 2 }, method: "agree-2", level: "locked", evidence: [{ measurement: "USGS GNIS 1533614", fact: "46.85283,-121.76044" }, { url: "https://www.openstreetmap.org/node/1", fact: "46.8528,-121.7604" }] }, now).length === 0);
  t("a sentence as fact is refused", validateEntry({ field: "approach", value: "x", method: "agree-2", level: "locked", evidence: [{ ...mp, fact: "From the trailhead follow the trail for three miles past the lake and then turn left at the big boulder and go up the gully to the col" }, ck] }, now).length > 0);
  const rows = [
    { field: "gain_ft", value: 9000, method: "measured", level: "locked" },
    { field: "approach", value: "old", method: "agree-2", level: "locked" },
    { field: "permit", value: "p", method: "official-1", level: "locked", expires_at: "2026-01-01T00:00:00Z" },
    { field: "waypoints/Summit", value: { name: "Summit", lat: 1, lng: 2 }, method: "agree-2", level: "locked" },
    { field: "grade", value: "5.9", method: "single-source", level: "locked-1src" },
  ];
  t("same value over a lock is fine", lockViolations({ gain_ft: 9000 }, rows, {}, now).length === 0);
  t("changing a locked field is refused", lockViolations({ approach: "new" }, rows, {}, now).length === 1);
  t("2 overturn sources are not enough for a full lock", lockViolations({ approach: "new" }, rows, { approach: [mp, ck] }, now).length === 1);
  t("3 independent overturn sources replace a full lock", lockViolations({ approach: "new" }, rows, { approach: [mp, ck, nps] }, now).length === 0);
  t("an expired official lock does not block", lockViolations({ permit: "q" }, rows, {}, now).length === 0);
  t("moving a locked pin is refused", lockViolations({ waypoints: [{ name: "Summit", lat: 1.1, lng: 2 }] }, rows, {}, now).length === 1);
  t("dropping a locked pin is refused", lockViolations({ waypoints: [{ name: "Camp", lat: 3, lng: 4 }] }, rows, {}, now).length === 1);
  t("keeping a locked pin while adding others is fine", lockViolations({ waypoints: [{ name: "Summit", lat: 1, lng: 2, elev: 5 }, { name: "Camp", lat: 3, lng: 4 }] }, rows, {}, now).length === 0);
  t("a 1-source lock is replaced by 2 sources", lockViolations({ grade: "5.10a" }, rows, { grade: [mp, ck] }, now).length === 0);
  t("ledger value must match the final row", ledgerValueMatches({ field: "gain_ft", value: 9000 }, { gain_ft: 9000 }) && !ledgerValueMatches({ field: "gain_ft", value: 9001 }, { gain_ft: 9000 }));
  t("pin ledger value matches by name+coords", ledgerValueMatches({ field: "waypoints/Summit", value: { name: "Summit", lat: 1, lng: 2 } }, { waypoints: [{ name: "Summit", lat: 1, lng: 2, elev: 9 }] }));
  const h = nextLedgerRow("r", { field: "approach", value: "new", method: "agree-2", level: "locked", evidence: [mp, ck] }, rows[1], "b1", now);
  t("history keeps the replaced value", h.history.length === 1 && h.history[0].value === "old");
  if (fail) { console.error(`\n${fail} self-test case(s) failed`); process.exit(1); }
  console.log("\nresearch-ledger self-test: all cases pass");
}

if (process.argv.includes("--selftest")) selftest();

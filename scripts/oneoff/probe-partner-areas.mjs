// Prove 0300's contract with REAL accounts, under RLS, on each climber's own JWT.
//
// Same method as probe-partners-near-with-real-accounts.mjs: the service key CREATES and DELETES the
// throwaway accounts and nothing else; every read, write and search under test goes through the anon
// key plus that climber's own session, exactly as the app does it.
//
// What must hold (the 0300 header, as assertions):
//   * a listing is readable and writable by its owner and by NOBODY else through the table;
//   * a listing at a PEAK is refused; at world/country too;
//   * REACHABILITY IS TWO-WAY: listed at the canyon surfaces at a crag inside it (listed_above=true);
//     listed at the crag surfaces at the canyon and the range above it (listed_above=false);
//   * the caller is never returned; an UNLISTED (discoverable=false) climber is never returned;
//     a climber who blocked the caller is never returned;
//   * partners_for_my_areas returns nobody for a caller with no listings, and the overlapping climbers
//     (with shared_count and via_area_names) for one who has;
//   * partner_area_counts counts distinct climbers by the same two-way rule;
//   * partner_areas_of_users returns the listings of the climbers asked for, and an EXPIRED window
//     reads back as no window while the listing stays;
//   * match_objectives_of_users drops a crag-route objective and keeps an alpine one;
//   * a signed-out caller is refused by every function.
//
// Uses the live Utah catalog: ut_hellgate_cliffs (crag) < ut_little_cottonwood_canyon (canyon) <
// ut_wasatch_range (range). Accounts live on the reserved .invalid domain and are deleted in a
// finally; the run then COUNTS what is left rather than trusting the deletes.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const CRAG = "ut_hellgate_cliffs", CANYON = "ut_little_cottonwood_canyon", RANGE = "ut_wasatch_range";
let pass = 0, fail = 0;
const ok = (l) => { pass++; console.log("  ok   " + l); };
const bad = (l, d) => { fail++; console.log("  FAIL " + l + (d ? "  -- " + d : "")); };
const check = (cond, l, d) => (cond ? ok(l) : bad(l, d));
const svc = requireServiceKey();

async function api(path, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const made = [];
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "areas-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const { status, body } = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "QA Fixture " + tag } }) }, svc);
  if (status >= 300 || !body || !body.id) throw new Error("create " + tag + " failed (" + status + ")");
  const u = { id: body.id, tag, email, password };
  made.push(u);
  const t = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  if (!t.body || !t.body.access_token) throw new Error("sign in " + tag + " failed (" + t.status + ")");
  u.jwt = t.body.access_token;
  return u;
}
const as = (u, path, opts) => api(path, opts || {}, anonKey(), u && u.jwt);
const rpc = (u, fn, args) => as(u, "/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(args) });
const listAt = (u, area_id, extra) => as(u, "/rest/v1/partner_areas?select=id,area_id,disciplines,free_from,free_to", { method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" }, body: JSON.stringify({ user_id: u.id, area_id, ...(extra || {}) }) });
async function setDiscoverable(u, v) {
  const r = await as(u, "/rest/v1/profiles?id=eq." + u.id + "&select=id,discoverable", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ discoverable: v }) });
  if (!Array.isArray(r.body) || r.body.length !== 1) throw new Error("discoverable for " + u.tag + " failed (" + r.status + ")");
}
const ids = (r) => (Array.isArray(r.body) ? r.body.map((x) => x.id) : []);
const row = (r, id) => (Array.isArray(r.body) ? r.body.find((x) => x.id === id) : null);

async function main() {
  console.log("partner_areas (0300) — real accounts, anon key + each climber's own JWT\n");
  const cat = await api("/rest/v1/areas?id=in.(" + [CRAG, CANYON, RANGE].join(",") + ")&select=id,area_type", {}, anonKey());
  if (!Array.isArray(cat.body) || cat.body.length !== 3) throw new Error("the Utah fixture areas are not all in the catalog: " + JSON.stringify(cat.body));
  const peakRow = await api("/rest/v1/areas?area_type=eq.peak&select=id&limit=1", {}, anonKey());
  const PEAK = peakRow.body && peakRow.body[0] && peakRow.body[0].id;
  if (!PEAK) throw new Error("no peak in the catalog to refuse");
  const alpineRow = await api("/rest/v1/routes?discipline=eq.alpine&select=id&limit=1", {}, anonKey());
  const cragRow = await api("/rest/v1/routes?discipline=eq.sport&select=id,area_id&limit=1", {}, anonKey());
  const ALPINE = alpineRow.body && alpineRow.body[0] && alpineRow.body[0].id, SPORT = cragRow.body && cragRow.body[0] && cragRow.body[0].id;
  if (!ALPINE || !SPORT) throw new Error("need one alpine and one sport route in the catalog");

  const A = await createUser("searcher"), B = await createUser("canyon"), C = await createUser("crag"), D = await createUser("unlisted"), E = await createUser("elsewhere");
  for (const u of [A, B, C, E]) await setDiscoverable(u, true);
  await setDiscoverable(D, false);

  // ---- the table is the owner's alone
  const bl = await listAt(B, CANYON, { disciplines: ["sport", "trad"] });
  check(bl.status < 300 && Array.isArray(bl.body) && bl.body.length === 1, "an owner lists themselves at a canyon", JSON.stringify(bl.body));
  const cl = await listAt(C, CRAG, { disciplines: ["sport"], free_from: "2030-06-01", free_to: "2030-06-02" });
  check(cl.status < 300 && Array.isArray(cl.body) && cl.body.length === 1, "an owner lists themselves at a crag with a date window", JSON.stringify(cl.body));
  const dl = await listAt(D, CRAG, {});
  check(dl.status < 300, "an unlisted (discoverable=false) climber can still hold a listing row", JSON.stringify(dl.body));
  const el = await listAt(E, "ut_hellgate_condos", { free_from: "2020-01-01", free_to: "2020-01-02" });
  check(el.status < 300, "a listing with an EXPIRED window is accepted", JSON.stringify(el.body));
  const peek = await as(A, "/rest/v1/partner_areas?select=user_id");
  check(Array.isArray(peek.body) && peek.body.length === 0, "another climber reads NOTHING of the table directly", JSON.stringify(peek.body));
  const forge = await as(A, "/rest/v1/partner_areas", { method: "POST", body: JSON.stringify({ user_id: C.id, area_id: RANGE }) });
  check(forge.status >= 400, "a climber cannot list somebody else", "status " + forge.status);
  const atPeak = await listAt(A, PEAK, {});
  check(atPeak.status >= 400 && /peak/i.test(JSON.stringify(atPeak.body)), "a listing at a PEAK is refused, naming the reason", JSON.stringify(atPeak.body));
  const atCountry = await listAt(A, "usa", {});
  check(atCountry.status >= 400, "a listing at a country is refused", JSON.stringify(atCountry.body));
  const badDisc = await listAt(A, CRAG, { disciplines: ["alpine"] });
  check(badDisc.status >= 400, "a non-crag discipline is refused by the CHECK", JSON.stringify(badDisc.body));

  // ---- signed out
  for (const fn of ["partners_in_area", "partners_for_my_areas", "partner_area_counts", "partner_areas_of_users", "match_objectives_of_users"]) {
    const r = await api("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(fn === "partners_in_area" ? { p_area_id: CRAG } : fn === "partners_for_my_areas" ? {} : fn === "partner_area_counts" ? { p_area_ids: [CRAG] } : { p_ids: [B.id] }) }, anonKey());
    check(r.status >= 400, fn + " refuses a signed-out caller", "status " + r.status);
  }

  // ---- two-way reachability
  const atCrag = await rpc(A, "partners_in_area", { p_area_id: CRAG });
  check(atCrag.status < 300, "partners_in_area runs for a signed-in caller", JSON.stringify(atCrag.body));
  check(ids(atCrag).includes(C.id), "listed AT the crag surfaces when searching the crag");
  check(ids(atCrag).includes(B.id), "listed at the CANYON above surfaces when searching the crag (ancestor reach)");
  check(ids(atCrag).includes(E.id), "listed at a sub-area INSIDE the crag surfaces when searching the crag (descendant reach)");
  check(!ids(atCrag).includes(D.id), "an UNLISTED climber is never returned");
  check(!ids(atCrag).includes(A.id), "the caller is never returned to themselves");
  const cR = row(atCrag, C.id), bR = row(atCrag, B.id), eR = row(atCrag, E.id);
  check(cR && cR.listed_above === false && bR && bR.listed_above === true, "listed_above is false for the crag listing and true for the canyon one", JSON.stringify([cR && cR.listed_above, bR && bR.listed_above]));
  check(ids(atCrag).indexOf(C.id) < ids(atCrag).indexOf(B.id), "a listing here or inside sorts before one across a wider area");
  check(cR && cR.free_from === "2030-06-01" && cR.free_to === "2030-06-02", "a live date window is returned", JSON.stringify(cR && [cR.free_from, cR.free_to]));
  check(eR && eR.free_from === null && eR.free_to === null, "an EXPIRED window reads back as no window, the listing stays", JSON.stringify(eR && [eR.free_from, eR.free_to]));
  check(cR && Array.isArray(cR.listed_disciplines) && cR.listed_disciplines.join() === "sport", "the listing's disciplines come back", JSON.stringify(cR && cR.listed_disciplines));
  check(cR && !("zip" in cR) && !("lat" in cR) && !("lng" in cR) && cR.dist_mi === null, "no zip or coordinate; dist_mi is null without an origin", JSON.stringify(cR && Object.keys(cR)));
  check(cR && typeof cR.show_name === "boolean", "show_name is carried (the PARTNER_COLS contract)");
  const atRange = await rpc(A, "partners_in_area", { p_area_id: RANGE });
  check(ids(atRange).includes(C.id) && ids(atRange).includes(B.id) && ids(atRange).includes(E.id), "searching the RANGE reaches the canyon, crag and sub-area listings (descendant reach)");
  const rC = row(atRange, C.id);
  check(rC && rC.listed_above === false, "from the range, the crag listing is inside it, not above it");
  const unknown = await rpc(A, "partners_in_area", { p_area_id: "no_such_area_xyz" });
  check(unknown.status >= 400, "an unknown area is refused");

  // ---- Near my areas
  const none = await rpc(A, "partners_for_my_areas", {});
  check(none.status < 300 && Array.isArray(none.body) && none.body.length === 0, "a caller with NO listings gets an empty Near-my-areas (the banner case)", JSON.stringify(none.body));
  const al = await listAt(A, CRAG, { disciplines: ["trad"] });
  if (al.status >= 300) bad("A lists at the crag", JSON.stringify(al.body));
  const mine = await rpc(A, "partners_for_my_areas", {});
  check(ids(mine).includes(B.id) && ids(mine).includes(C.id) && ids(mine).includes(E.id) && !ids(mine).includes(D.id) && !ids(mine).includes(A.id), "Near my areas reaches the canyon, crag and sub-area climbers and nobody else", JSON.stringify(ids(mine)));
  const mB = row(mine, B.id);
  check(mB && mB.shared_count === 1 && Array.isArray(mB.via_area_names) && mB.via_area_names.length === 1, "each row says how many areas matched and via which of MINE", JSON.stringify(mB && [mB.shared_count, mB.via_area_names]));

  // ---- counts
  const counts = await rpc(A, "partner_area_counts", { p_area_ids: [CRAG, RANGE, CANYON] });
  const cnt = Object.fromEntries((counts.body || []).map((r) => [r.area_id, r.listed_count]));
  check(cnt[CRAG] === 3, "the crag counts the crag, canyon and sub-area climbers (3), not the unlisted one or the caller", JSON.stringify(cnt));
  check(cnt[RANGE] === 3 && cnt[CANYON] === 3, "the range and canyon count the same three", JSON.stringify(cnt));

  // ---- listings of the climbers on screen
  const of = await rpc(A, "partner_areas_of_users", { p_ids: [B.id, C.id, D.id, A.id] });
  const byU = {};
  (of.body || []).forEach((r) => { (byU[r.user_id] = byU[r.user_id] || []).push(r); });
  check(byU[B.id] && byU[B.id].length === 1 && byU[B.id][0].area_id === CANYON && byU[B.id][0].area_path.startsWith("usa."), "partner_areas_of_users returns B's canyon listing with its path", JSON.stringify(byU[B.id]));
  check(byU[A.id] && byU[A.id].length === 1, "...and the caller's own");
  check(!byU[D.id], "...and NOT an unlisted climber's", JSON.stringify(byU[D.id]));

  // ---- objectives that still count
  for (const [u, rid] of [[B, ALPINE], [B, SPORT], [B, "seed_route_not_in_catalog"]]) {
    const r = await as(u, "/rest/v1/objectives", { method: "POST", body: JSON.stringify({ user_id: u.id, route_id: rid }) });
    if (r.status >= 300) bad("B saves objective " + rid, JSON.stringify(r.body));
  }
  const mo = await rpc(A, "match_objectives_of_users", { p_ids: [B.id] });
  const kept = (mo.body || []).map((r) => r.route_id);
  check(kept.includes(ALPINE), "an alpine objective still counts for matching", JSON.stringify(kept));
  check(!kept.includes(SPORT), "a SPORT objective has left matching (it stays a tick list)", JSON.stringify(kept));
  check(!kept.includes("seed_route_not_in_catalog"), "a route the catalog does not hold does not count", JSON.stringify(kept));

  // ---- a block hides the blocker from the blocked
  const blk = await as(C, "/rest/v1/blocked_users", { method: "POST", body: JSON.stringify({ blocker: C.id, blocked: A.id }) });
  if (blk.status >= 300) bad("C can block A", JSON.stringify(blk.body));
  const afterBlock = await rpc(A, "partners_in_area", { p_area_id: CRAG });
  check(!ids(afterBlock).includes(C.id) && ids(afterBlock).includes(B.id), "a climber who blocked the caller is no longer returned (and others still are)", JSON.stringify(ids(afterBlock)));
  const counts2 = await rpc(A, "partner_area_counts", { p_area_ids: [CRAG] });
  check(counts2.body && counts2.body[0] && counts2.body[0].listed_count === 2, "...and the count drops with them", JSON.stringify(counts2.body));

  // ---- cap
  const many = await api("/rest/v1/areas?area_type=eq.crag&select=id&limit=31", {}, anonKey());
  let refusedAt = null;
  for (const a of many.body || []) { const r = await listAt(E, a.id, {}); if (r.status >= 400) { refusedAt = r.body; break; } }
  check(refusedAt && /30/.test(JSON.stringify(refusedAt)), "the 30-listing cap refuses the 31st", JSON.stringify(refusedAt));
}

try {
  await main();
} catch (e) {
  bad("probe crashed", e && e.message);
} finally {
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
  if (made.length) {
    const left = await api("/rest/v1/partner_areas?user_id=in.(" + made.map((u) => u.id).join(",") + ")&select=user_id", {}, svc);
    check(Array.isArray(left.body) && left.body.length === 0, "teardown: no fixture listing survives (deleted accounts cascade)", JSON.stringify(left.body));
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exitCode = fail ? 1 : 0;
}

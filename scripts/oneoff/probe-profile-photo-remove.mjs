// CAN A CLIMBER TAKE A PROFILE PHOTO BACK DOWN, AND DOES A FAILED REMOVAL DESTROY THE FILE?
//
// PhotoStrip has offered `onAdd` and nothing to undo it, so the only thing a climber could do
// about a photo they regretted was HIDE it -- and 0174 is explicit that `photos_public` is
// SURFACING ONLY, not access control, so hiding never stopped the row being served to anyone
// holding the anon key. This probe covers the remove path that closes that.
//
// Two questions, and they fail in opposite directions, so they are asked separately:
//
//   1. WHO GETS THE CONTROL. PhotoStrip renders three different people's photos -- your own
//      profile, FullProfile (somebody else's), TripReport (a report author's). A remove control
//      on the wrong one lets a climber take down another climber's photo. Static, because the
//      gate is the ABSENCE of a prop and a render can only ever show the sites that pass it.
//
//   2. WHAT THE REMOVAL ACTUALLY DOES. Executed against a stubbed transport, because the
//      dangerous case is a FAILED write, which a live database will not produce on demand. The
//      property is deleteRoutePhoto's: drop the REFERENCE first, then the storage object. Delete
//      the object first and a surviving array entry points at a file that is gone -- a broken
//      image on the profile, and an unrecoverable one.
//
// READ-ONLY. It writes to no database and uploads nothing: every request is answered by a stub.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let failed = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { failed++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

// ── 1. WHO GETS THE CONTROL ────────────────────────────────────────────────────────────────
console.log("1. which PhotoStrip call sites can remove a photo\n");

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const sites = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  // Balance the tag rather than taking a fixed window: these files pack whole screens onto one
  // physical line, so a character budget encodes a guess about the size of the thing being read
  // -- the trap check:camping records three times over.
  for (const m of src.matchAll(/<PhotoStrip\b/g)) {
    let i = m.index, depth = 0, end = -1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) { end = i + 1; break; }
    }
    if (end < 0) dead(`an unterminated <PhotoStrip> tag in ${f}`);
    sites.push({ file: f, tag: src.slice(m.index, end) });
  }
}
// Fail closed: with no sites found, every "must not offer removal" assertion below passes
// vacuously, which is the false-pass direction.
if (sites.length < 3) dead(`found ${sites.length} <PhotoStrip> call site(s); expected the 3 this app has`);

const withRemove = sites.filter((s) => /\bonRemove=/.test(s.tag));
const own = sites.filter((s) => /photos=\{profilePhotos\}/.test(s.tag));

console.log(`   ${sites.length} call sites; ${withRemove.length} offer removal\n`);
for (const s of sites) {
  const who = /photos=\{profilePhotos\}/.test(s.tag) ? "your own profile"
    : /climber\.photos/.test(s.tag) ? "another climber's profile"
    : /ascent\.photos/.test(s.tag) ? "a trip report" : "unknown";
  console.log(`   ${s.file.padEnd(20)} ${who.padEnd(26)} onRemove=${/\bonRemove=/.test(s.tag) ? "YES" : "no"}`);
}
console.log("");

if (own.length !== 1) bad(`expected exactly 1 call site rendering your own strip, found ${own.length}`);
else ok("your own profile strip is a single, identifiable call site");

if (withRemove.length !== 1) bad(`exactly one call site may offer removal; ${withRemove.length} do`);
else if (!/photos=\{profilePhotos\}/.test(withRemove[0].tag)) bad("the removable strip is not your own profile's");
else ok("only your own profile offers a remove control");

for (const s of sites) {
  if (/\bonRemove=/.test(s.tag)) continue;
  if (/climber\.photos|ascent\.photos/.test(s.tag)) ok(`someone else's photos stay read-only (${s.file})`);
}

// The component must actually consult the prop -- a call site that passes onRemove to a
// component ignoring it is the dead-wiring shape, and reads as a shipped feature.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const decl = core.match(/function PhotoStrip\(\{([^}]*)\}\)/);
if (!decl) dead("PhotoStrip's signature moved — ANCHOR LOST");
if (!/\bonRemove\b/.test(decl[1])) bad("PhotoStrip does not destructure onRemove");
else ok("PhotoStrip destructures onRemove");
if (!/onRemove\?/.test(core)) bad("PhotoStrip never renders anything conditional on onRemove");
else ok("the remove control is gated on onRemove being passed");

// ── 2. WHAT THE REMOVAL ACTUALLY DOES ──────────────────────────────────────────────────────
console.log("\n2. removeProfilePhoto against a stubbed transport\n");

const out = path.join(ROOT, `.photo-remove-probe-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "lib/db.js"),
    "--bundle", "--format=esm", "--platform=node",
    `--define:import.meta.env=${JSON.stringify({ VITE_USE_DB: "true", VITE_SUPABASE_URL: "https://probe.invalid", VITE_SUPABASE_ANON_KEY: "probe" })}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  fs.rmSync(out, { force: true });
  dead("esbuild could not bundle lib/db.js");
}
// createClient builds a RealtimeClient at construction, which wants a WebSocket constructor:
// native on node 22, absent on 20, so a probe that does not stub it passes in CI and dies on a
// contributor's machine.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

// The transport stub. `deadlineFetch` in lib/supabase.js calls the free identifier `fetch`, so
// this is resolved at call time and the override lands however the bundle was built.
let calls = [];
let patchStatus = 200;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input && input.url) || String(input);
  const method = ((init && init.method) || "GET").toUpperCase();
  const body = init && init.body ? String(init.body) : "";
  calls.push({ url, method, body });
  if (url.includes("/rest/v1/profiles")) {
    return patchStatus === 200
      ? new Response(JSON.stringify({ id: "u1" }), { status: 200, headers: { "Content-Type": "application/json" } })
      : new Response(JSON.stringify({ message: "stubbed refusal" }), { status: patchStatus, headers: { "Content-Type": "application/json" } });
  }
  if (url.includes("/storage/v1/object")) {
    return new Response(JSON.stringify([{ name: "removed" }]), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
};

const db = await import(out + "?t=" + Date.now());
fs.rmSync(out, { force: true });
if (typeof db.removeProfilePhoto !== "function") dead("removeProfilePhoto is not exported from lib/db.js — ANCHOR LOST");
if (typeof db.photoStorageKey !== "function") dead("photoStorageKey is not exported from lib/db.js — ANCHOR LOST");

const A = "https://probe.invalid/storage/v1/object/public/topo-photos/u1/aaa-one.jpg";
const B = "https://probe.invalid/storage/v1/object/public/topo-photos/u1/bbb-two.jpg";
const CC = "https://probe.invalid/storage/v1/object/public/topo-photos/u1/ccc-three.jpg";
const BLOB = "blob:https://localhost/9f2c-local-preview";

const reset = (status) => { calls = []; patchStatus = status === undefined ? 200 : status; };
const patches = () => calls.filter((c) => c.url.includes("/rest/v1/profiles"));
const storageDeletes = () => calls.filter((c) => c.url.includes("/storage/v1/object"));

// The transport itself has to be proven live, or every "no request was made" assertion below is
// satisfied by a stub nothing ever reached.
reset();
const next1 = await db.removeProfilePhoto("u1", B, [A, B, CC]);
if (!patches().length) dead("the stub recorded no PATCH at all — nothing here is measuring the real client");

// (a) the happy path
if (JSON.stringify(next1) !== JSON.stringify([A, CC])) bad(`removed the wrong entry: ${JSON.stringify(next1)}`);
else ok("removing the middle photo returns the other two, in order");
const sent = patches()[0] ? JSON.parse(patches()[0].body || "{}") : {};
if (JSON.stringify(sent.photos) !== JSON.stringify([A, CC])) bad(`the write sent ${JSON.stringify(sent.photos)}`);
else ok("the array WRITTEN is the array returned — not an assumption about it");
if (storageDeletes().length !== 1) bad(`expected 1 storage delete, saw ${storageDeletes().length}`);
else if (!storageDeletes()[0].body.includes("u1/bbb-two.jpg")) bad(`deleted the wrong object: ${storageDeletes()[0].body}`);
else ok("the storage object deleted is the one that left the array");

// (b) THE ONE THAT MATTERS: a refused write must not destroy the file.
reset(500);
let threw = null;
try { await db.removeProfilePhoto("u1", B, [A, B, CC]); } catch (e) { threw = e; }
if (!threw) bad("a refused write resolved instead of throwing — the caller would toast success");
else ok("a refused write throws, so no success message can sit in front of it");
if (storageDeletes().length) bad(`a FAILED removal deleted ${storageDeletes().length} storage object(s) — the photo is gone and the profile still lists it`);
else ok("a failed removal leaves the storage object alone");

// (c) a no-op must not read as success
reset();
threw = null;
try { await db.removeProfilePhoto("u1", "https://probe.invalid/not/on/the/profile.jpg", [A, B]); } catch (e) { threw = e; }
if (!threw) bad("removing a photo that is not on the profile resolved as success");
else ok("removing something the profile does not hold throws rather than reporting success");
if (patches().length) bad("it wrote the array back unchanged before deciding");
else ok("...and it does so before writing anything");

// (d) a signed-out blob: preview has no object of ours behind it
reset();
const next4 = await db.removeProfilePhoto("u1", BLOB, [BLOB, A]);
if (JSON.stringify(next4) !== JSON.stringify([A])) bad(`blob removal returned ${JSON.stringify(next4)}`);
else ok("a local blob: preview comes off the strip");
if (storageDeletes().length) bad("it asked storage to delete something for a blob: URL");
else ok("...and asks storage to delete nothing, because there is no object of ours");
if (db.photoStorageKey(BLOB) !== null) bad("photoStorageKey resolved a key for a blob: URL");
else ok("photoStorageKey returns null for a URL that is not one of ours");

// (e) the key reversal round-trips, since a wrong key silently deletes nothing or the wrong file
if (db.photoStorageKey(A) !== "u1/aaa-one.jpg") bad(`photoStorageKey(A) = ${db.photoStorageKey(A)}`);
else ok("photoStorageKey reverses a public URL back to its object key");

// (f) a duplicated URL: every copy goes, and the object with it. Unreachable through the app's
// own add path (each upload gets a fresh uuid), but the behaviour should be coherent rather
// than accidental, and it is what makes the storage delete unconditionally safe.
reset();
const next6 = await db.removeProfilePhoto("u1", A, [A, B, A]);
if (JSON.stringify(next6) !== JSON.stringify([B])) bad(`duplicate removal returned ${JSON.stringify(next6)}`);
else ok("a URL listed twice comes off entirely, leaving nothing pointing at the object");

globalThis.fetch = realFetch;
console.log(`\n${failed ? "FAILED — " + failed + " assertion(s)" : "ok — every assertion passed"}`);
process.exit(failed ? 1 : 0);

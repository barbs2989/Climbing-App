// Does 0229's kudos table keep its promises, as two REAL accounts see it?
//
// A 200 is not evidence under RLS (CLAUDE.md), so every write is followed by a read, and every
// refusal is checked against a CONTROL that shows the same request succeeding when it should.
// Uses the two-account fixture check:block-guarantees uses; the service key creates and removes
// the accounts and is used nowhere else.
//
//   node scripts/oneoff/verify-kudos-rls.mjs
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { createFixture } from "../lib/ui-fixture.mjs";

const URL = SUPABASE_URL, ANON = anonKey();
if (!URL || !ANON) { console.error("FAIL: no Supabase url/anon key — nothing was verified."); process.exit(1); }
let fail = 0;
const ok = (label, cond, detail) => { console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`); if (!cond) fail++; };
const dead = (m) => { throw new Error("nothing was verified: " + m); };

async function signIn(u) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok || !b.access_token) dead(`could not sign in as ${u.email} (${r.status})`);
  return b.access_token;
}
const as = (tok) => async (p, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};

const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate;   // A gives kudos on B's climb
let blockId = null;
const today = new Date().toISOString().slice(0, 10);
try {
  const a = as(await signIn(A)), b = as(await signIn(B));
  const mkLog = async (who, id) => {
    const r = await who("climb_logs", { method: "POST", body: JSON.stringify({ user_id: id, route_id: "wa_mount_baker_north_ridge", discipline: "alpine", date_climbed: today, trip_report_visibility: "public" }) });
    if (r.status >= 300 || !r.json || !r.json[0]) dead(`could not create a climb log (${r.status}) ${r.text.slice(0, 160)}`);
    return r.json[0].id;
  };
  const bLog = await mkLog(b, B.id), aLog = await mkLog(a, A.id);

  const give = await a("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: B.id, climb_log_id: bLog, route_name: "Mount Baker North Ridge" }) });
  ok("A can give kudos on B's climb", give.status === 201, `${give.status} ${give.text.slice(0, 160)}`);

  const again = await a("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: B.id, climb_log_id: bLog }) });
  ok("...but only once per climb", again.status === 409, `${again.status} ${again.text.slice(0, 120)}`);

  const wrong = await a("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: B.id, climb_log_id: aLog }) });
  ok("a kudos naming B on a climb that is NOT B's is refused", wrong.status >= 400, `${wrong.status}`);

  const self = await a("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: A.id, climb_log_id: aLog }) });
  ok("kudos to yourself is refused", self.status >= 400, `${self.status}`);

  const forge = await b("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: A.id, climb_log_id: aLog }) });
  ok("B cannot file a kudos as if A gave it", forge.status >= 400, `${forge.status}`);

  const recv = await b(`kudos?receiver=eq.${B.id}&select=id,giver,route_name`);
  ok("B (receiver) reads the kudos", recv.status === 200 && recv.json.length === 1 && recv.json[0].giver === A.id, `${recv.status} ${recv.text.slice(0, 160)}`);
  const mine = await a(`kudos?giver=eq.${A.id}&select=id,climb_log_id`);
  ok("A (giver) reads their own kudos", mine.status === 200 && mine.json.length === 1 && mine.json[0].climb_log_id === bLog, `${mine.status} ${mine.text.slice(0, 160)}`);

  const steal = await b(`kudos?climb_log_id=eq.${bLog}`, { method: "DELETE" });
  const still = await a(`kudos?climb_log_id=eq.${bLog}&select=id`);
  ok("B cannot delete A's kudos (0 rows) and it is still there", Array.isArray(steal.json) && steal.json.length === 0 && still.json && still.json.length === 1, `${steal.status} ${steal.text.slice(0, 80)} / still ${still.text.slice(0, 80)}`);

  const back = await a(`kudos?giver=eq.${A.id}&climb_log_id=eq.${bLog}`, { method: "DELETE" });
  const gone = await b(`kudos?receiver=eq.${B.id}&select=id`);
  ok("A can take it back, and B no longer sees it", Array.isArray(back.json) && back.json.length === 1 && gone.json && gone.json.length === 0, `${back.status} ${back.text.slice(0, 80)} / ${gone.text.slice(0, 80)}`);

  const blk = await b("blocked_users", { method: "POST", body: JSON.stringify({ blocker: B.id, blocked: A.id }) });
  if (blk.status >= 300 || !blk.json || !blk.json[0]) dead(`B could not block A (${blk.status}) ${blk.text.slice(0, 160)}`);
  blockId = blk.json[0].id;
  const blocked = await a("kudos", { method: "POST", body: JSON.stringify({ giver: A.id, receiver: B.id, climb_log_id: bLog }) });
  ok("once B blocks A, A cannot send B kudos", blocked.status >= 400, `${blocked.status} ${blocked.text.slice(0, 120)}`);
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")"); fail++;
} finally {
  try { if (blockId) await as(await signIn(B))(`blocked_users?id=eq.${blockId}`, { method: "DELETE" }); } catch {}
  const left = await fx.cleanup();
  if (Array.isArray(left) && left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
}
console.log(fail ? `\n${fail} failure(s).` : "\nok — kudos reach only the climber they are for, once, and only the giver can take them back.");
process.exit(fail ? 1 : 0);

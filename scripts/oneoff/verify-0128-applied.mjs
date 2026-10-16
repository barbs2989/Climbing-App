// Did 0128 actually take? Three questions, verified by BEHAVIOUR, not by reading a schema.
//
//   1. Does approve_new_route accept p_grade_num?          (0128 applied at all)
//   2. Is the one-arg call still unambiguous?              (the old signature was dropped)
//   3. Would this probe notice a missing parameter?        (the control — see below)
//
// (2) matters because `create or replace` with an added parameter does not replace anything —
// a different argument list is a different function. If the DROP did not run, Postgres holds
// both approve_new_route(uuid) and (uuid, numeric); PostgREST then has two candidates that
// each accept {p_contribution_id}, and the one-arg version can keep being called and keep
// writing nulls with nothing failing.
//
// WHY NOT READ THE OpenAPI SPEC. The first version of this script did, and it was wrong twice
// over: the root endpoint needs the SECRET key (401 to anon, whose JSON body makes every
// column and function read as ABSENT), and even with the right key PostgREST does not
// advertise this RPC's argument names the way that version assumed — it reported `[]` and
// declared 0128 unapplied while the function was in fact live. A reader that cannot tell
// "missing" from "I failed to look" is worse than no reader.
//
// (3) is what makes (1) mean anything: if PostgREST silently ignored unknown arguments, a
// successful two-arg call would prove nothing at all. It does not — an unknown name returns
// PGRST202 — and this asserts that rather than assuming it.
//
// Expected shape of a healthy run: every call reaches the function's OWN admin gate (P0001),
// because the service key carries no JWT, so auth.uid() is null and is_admin(null) is false.
// Reaching P0001 means PostgREST resolved and invoked the function. Nothing is written.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const NOBODY = "00000000-0000-0000-0000-000000000000";
const H = { ...headers(requireServiceKey()), "Content-Type": "application/json" };

async function call(body) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/approve_new_route", {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.text() };
}

const notFound = (r) => r.status === 404 || /PGRST202/.test(r.body);
const ambiguous = (r) => r.status === 300 || /PGRST203|could not choose|is not unique/i.test(r.body);
const reachedFn = (r) => /P0001/.test(r.body);   // the function's own admin gate

let bad = 0;
const check = (label, cond, detail) => { console.log(`  ${cond ? "ok  " : "FAIL"}  ${label}${cond ? "" : " — " + detail}`); if (!cond) bad++; };

const control = await call({ p_contribution_id: NOBODY, p_definitely_not_a_param: 1 });
check("CONTROL: an unknown argument is rejected", notFound(control),
  `PostgREST accepted a bogus parameter (${control.status}) — this probe cannot detect a missing one, so nothing below means anything`);

const two = await call({ p_contribution_id: NOBODY, p_grade_num: 9 });
check("p_grade_num is accepted (0128 applied)", !notFound(two) && reachedFn(two),
  `two-arg call returned ${two.status}: ${two.body.slice(0, 200)}`);

const one = await call({ p_contribution_id: NOBODY });
check("one-arg call is unambiguous (old signature dropped)", !ambiguous(one) && reachedFn(one),
  `one-arg call returned ${one.status}: ${one.body.slice(0, 200)}`);

console.log(bad ? `\n${bad} check(s) failed — 0128 is not correctly applied` : "\n0128 is applied, and approve_new_route resolves unambiguously");
process.exit(bad ? 1 : 0);

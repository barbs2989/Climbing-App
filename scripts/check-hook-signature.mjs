// check:hook-signature — the screen-content hook's signature (0427) agrees on both ends, and refuses
// what it should.
//
// The database signs with pgcrypto's hmac() in screen_after_insert; the edge function checks with
// WebCrypto in supabase/functions/_shared/hooksig.ts. If those two ever disagree (a changed
// separator, a different encoding), every screening call is refused with 401 and nothing is screened
// by the model -- silently, since the trigger swallows pg_net errors. So this checks:
//   1. hooksig.ts matches an independent node:crypto HMAC;
//   2. pgcrypto's hmac(), as the trigger calls it, produces the same hex (PGlite);
//   3. fresh+correct passes; stale, too-far-future, tampered, wrong-id and unsigned calls fail.
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { hookSignature, checkHook, MAX_AGE_SEC, MAX_SKEW_SEC } from "../supabase/functions/_shared/hooksig.ts";

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) failed++; };

const secret = "a3f1c0ffee" + "0".repeat(54);
const kind = "message", id = "6f1e2d3c-4b5a-4968-8776-655443322110";
const now = 1_800_000_000_000, ts = String(now / 1000);

const ts1 = await hookSignature(secret, ts, kind, id);
const node = createHmac("sha256", secret).update(`${ts}.${kind}.${id}`).digest("hex");
ok(ts1 === node, "hooksig.ts matches node:crypto HMAC-SHA256");

const db = await PGlite.create({ extensions: { pgcrypto } });
await db.exec("create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions;");
const { rows } = await db.query(
  "select encode(extensions.hmac($1 || '.' || $2 || '.' || $3::uuid::text, $4, 'sha256'), 'hex') as sig",
  [ts, kind, id, secret]);
ok(rows[0].sig === ts1, "pgcrypto hmac() as the trigger calls it matches hooksig.ts");
await db.close();

ok(await checkHook(secret, ts, ts1, kind, id, now) === "ok", "fresh, correct signature passes");
ok(await checkHook(secret, ts, ts1.toUpperCase(), kind, id, now) === "ok", "upper-case hex passes");
ok(await checkHook(secret, ts, ts1, kind, id, now + (MAX_AGE_SEC + 1) * 1000) === "stale", "replay after the window is stale");
ok(await checkHook(secret, ts, ts1, kind, id, now + MAX_AGE_SEC * 1000) === "ok", "inside the window still passes");
ok(await checkHook(secret, ts, ts1, kind, id, now - (MAX_SKEW_SEC + 1) * 1000) === "stale", "timestamp too far in the future is stale");
const later = String(Number(ts) + 5);
ok(await checkHook(secret, later, ts1, kind, id, now) === "bad_signature", "re-stamped timestamp with old signature is refused");
ok(await checkHook(secret, ts, ts1, kind, "00000000-0000-4000-8000-000000000000", now) === "bad_signature", "signature for another row is refused");
ok(await checkHook(secret, ts, ts1, "comment", id, now) === "bad_signature", "signature for another kind is refused");
ok(await checkHook("other" + secret, ts, ts1, kind, id, now) === "bad_signature", "wrong secret is refused");
ok(await checkHook(secret, null, null, kind, id, now) === "unsigned", "no headers is unsigned");
ok(await checkHook(secret, ts, ts1.slice(1), kind, id, now) === "unsigned", "truncated signature is unsigned");

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\ncheck:hook-signature passed");

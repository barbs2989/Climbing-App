/* THE PHONE'S HALF OF "I'M AT THE BASE" (lib/baseCheckin.js), executed rather than read.
 *
 * The server decides whether a point is at the climb; the phone decides whether its own GPS
 * readings describe where somebody is STANDING. Those rules only exist on the device (the server
 * cannot see individual readings or speed), so this is their only test. No browser, no database:
 * constructed samples, plus a fake geolocation for the adapter.
 *
 * Every refusal is paired with an acceptance — a module that refuses everything passes every
 * "must refuse" case, so the accept cases are the non-vacuity half.
 *
 *   node scripts/oneoff/probe-base-checkin-fix-rules.mjs
 */
import {
  summariseFixes, acquireBaseFix, clusterBasePoints, baseCheckinMessage, distM,
  BASE_MAX_ACCURACY_M, BASE_TARGET_SAMPLES,
} from "../../lib/baseCheckin.js";

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const is = (c, m, detail) => (c ? ok(m) : fail(m + (detail ? " — " + JSON.stringify(detail).slice(0, 200) : "")));

const BASE = { lat: 47.84033, lng: -117.75534 };
const off = (m, i) => ({ lat: BASE.lat + (m / 111320) * Math.cos(i), lng: BASE.lng + (m / 74800) * Math.sin(i) });
const at = (m, acc, t, speed) => ({ ...off(m, t), accuracy: acc, speed, t: 1_700_000_000_000 + t * 1000 });

console.log("--- summariseFixes ---");
let r = summariseFixes([at(2, 8, 0), at(4, 9, 2), at(3, 7, 4), at(1, 8, 6)]);
is(r.ok === true, "four steady 8 m readings are a position", r);
is(r.ok && distM(r, BASE) < 6, "...and the median lands where the readings are", r);
is(r.ok && r.samples === 4, "...counting all four good readings", r);
is(r.ok && r.fixedAt === new Date(1_700_000_006_000).toISOString(), "...timestamped at the LATEST reading, not now", r);

r = summariseFixes([at(2, 8, 0), at(4, 9, 2)]);
is(!r.ok && r.reason === "accuracy", "two good readings are not enough", r);

r = summariseFixes([at(2, 80, 0), at(4, 90, 2), at(3, 70, 4), at(1, 75, 6)]);
is(!r.ok && r.reason === "accuracy" && r.accuracy === 70, "four VAGUE readings are refused, quoting the best one", r);

r = summariseFixes([at(2, 80, 0), at(4, 9, 2), at(3, 7, 4), at(1, 8, 6)]);
is(r.ok && r.samples === 3, "one vague reading among good ones is dropped, not fatal", r);

r = summariseFixes([at(2, 8, 0), at(80, 9, 2), at(3, 7, 4), at(1, 8, 6)]);
is(!r.ok && r.reason === "unsteady", "a reading 80 m from the rest makes the position unsteady", r);

r = summariseFixes([at(2, 8, 0, 0.4), at(4, 9, 2, 0.8), at(3, 7, 4, 0.2)]);
is(r.ok, "shuffling about at 0.8 m/s is standing, not moving", r);
r = summariseFixes([at(2, 8, 0, 12), at(4, 9, 2), at(3, 7, 4)]);
is(!r.ok && r.reason === "moving", "one reading at 12 m/s says the phone was in a car", r);
r = summariseFixes([at(2, 200, 0, 12), at(4, 9, 2), at(3, 7, 4), at(1, 8, 6)]);
is(!r.ok && r.reason === "moving", "...even when that reading is too vague to use for the position", r);

is(summariseFixes([]).reason === "no_fix", "no readings at all is no fix");

console.log("\n--- acquireBaseFix (fake geolocation) ---");
const fakeGeo = (feed, err) => ({
  watchPosition(onPos, onErr) {
    if (err) { setTimeout(() => onErr(err), 5); return 1; }
    feed.forEach((s, i) => setTimeout(() => onPos({ coords: { latitude: s.lat, longitude: s.lng, accuracy: s.accuracy, speed: s.speed ?? null }, timestamp: s.t }), 5 * (i + 1)));
    return 1;
  },
  clearWatch() { this.cleared = true; },
});
const steady = Array.from({ length: BASE_TARGET_SAMPLES }, (_, i) => at(2, 8, i * 2));
let g = fakeGeo(steady);
r = await acquireBaseFix(g, { timeoutMs: 2000 });
is(r.ok && r.samples === BASE_TARGET_SAMPLES, "stops as soon as it has enough readings over enough time", r);
is(g.cleared === true, "...and stops watching the GPS");
g = fakeGeo(Array.from({ length: BASE_TARGET_SAMPLES }, (_, i) => at(2, 8, i * 0.5)));
r = await acquireBaseFix(g, { timeoutMs: 300 });
is(r.ok, "readings bunched in 2 s still resolve at the timeout rather than hanging", r);
r = await acquireBaseFix(fakeGeo([], { code: 1 }), { timeoutMs: 500 });
is(!r.ok && r.reason === "denied", "a permission refusal is reported as such", r);
r = await acquireBaseFix(null, { timeoutMs: 100 });
is(!r.ok && r.reason === "unsupported", "no geolocation API is reported as such", r);

console.log("\n--- clusterBasePoints ---");
const pts = [{ ...off(0, 0), mine: false }, { ...off(8, 1), mine: true }, { ...off(12, 2), mine: false }, { ...off(300, 0), mine: false }];
const cl = clusterBasePoints(pts);
is(cl.length === 2, "points 12 m apart are one spot, 300 m apart are two", cl);
is(cl[0].n === 3 && cl[0].mine === true, "the most-confirmed spot comes first and knows it includes you", cl);
is(cl[1].n === 1 && cl[1].mine === false, "the outlier stands alone", cl);

console.log("\n--- baseCheckinMessage ---");
const fmt = (m) => Math.round(m) + " m";
const reasons = ["denied", "unsupported", "unavailable", "no_fix", "moving", "accuracy", "unsteady", "too_far", "trailhead", "travel", "rate", "stale", "no_location", "bad_fix"];
const msgs = reasons.map((x) => baseCheckinMessage({ reason: x, distance_m: 1998, radius_m: 500, accuracy: 70, limit: BASE_MAX_ACCURACY_M, spread: 80, anchor: "crag" }, fmt));
is(msgs.every((m) => m && !/undefined|NaN/.test(m)), "every reason has a message with no undefined/NaN", msgs.filter((m) => /undefined|NaN/.test(m)));
is(new Set(msgs).size >= reasons.length - 1, "the reasons do not collapse into one generic line");
const tf = baseCheckinMessage({ reason: "too_far", distance_m: 1998, radius_m: 500, anchor: "crag" }, fmt);
is(/1998 m/.test(tf) && /500 m/.test(tf), "too_far states both the distance and the limit, in the formatter's units", tf);
is(/location on file may be wrong/.test(tf), "...and admits the location on file may be the wrong half", tf);

console.log(`\n${ran - bad}/${ran} passed`);
if (ran < 24) { console.log("FAIL: fewer assertions ran than written"); process.exit(1); }
process.exit(bad ? 1 : 0);

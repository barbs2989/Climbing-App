// Vite config used only by check:anniversary.
//
// Climb anniversaries are DATE-GATED: `_anniv` fires only for a log whose yearly anchor is
// within two days of today, so on ~360 days of the year the feature renders NOTHING -- and
// every render guard walks the app on one of those days. That is why #713 could revive it
// and no check could see it.
//
// So this makes the check's browser a SIGNED-IN climber whose climb_logs hold one ascent
// dated EXACTLY ONE YEAR AGO TODAY, and the check asserts the anniversary notification
// reaches the screen.
//
// Why signed in, and why through climb_logs: since #2789 alerts are the ACCOUNT's. A guest in
// a backend build has no account, every alert source is the seed demo, and mergedNotifs is
// empty for them by design. This used to prepend a clone of the SEED log to a guest's
// `logs`, a path #2789 legitimately closed -- the guard went red with the feature intact. A
// real climber's `logs` are filled from their climb_logs rows by the hydration effect, so the
// probe goes in there: a uid is forced (as zero-state.config.mjs does), and one synthetic row
// is prepended to what useUserLogs(uid) returns. The path held is therefore the shipping
// one: climb_logs row -> hydration -> logs -> _anniv -> mergedNotifs -> the screen.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const OPENER_ANCHOR = "  const prevUidRef=useRef(uid);";
const UID_ANCHOR = "const uid=(USE_DB&&session&&session.user)?session.user.id:null;";
const LOGS_Q_ANCHOR = "const myLogsQ=useUserLogs(uid);";
// A VALID uuid, unlike zero-state's: useUserLogs filters climb_logs on it, and a malformed
// one makes PostgREST answer 400, the query errors, and no hydration runs at all. A real
// uuid that owns nothing answers [] -- an account with no logs but the probe.
export const PROBE_UID = "00000000-0000-4000-8000-00000000a771";

// One year ago today, as YYYY-MM-DD in LOCAL time.
//
// Local, not UTC: `_anniv` builds its anchor with `new Date(y, m, d)` and compares against
// `new Date()`, both local, so a UTC-derived date would be a day off for anyone west of
// Greenwich for part of the day -- and the gate is +/- 2 days, so it would still pass and
// quietly prove less than it claims.
//
// Feb 29 needs no special case: "2025-02-29T12:00:00" parses to Mar 1, so the anchor lands
// one day off todayand the +/- 2 day window still catches it.
export function oneYearAgoISO(now = new Date()) {
  const y = now.getFullYear() - 1;
  const p = (n) => String(n).padStart(2, "0");
  return `${y}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// The climb_logs row the probe account holds. Only the columns the hydration effect in
// ClimbMatch.jsx reads; every other one it defaults when absent, as it does for a real row
// with nulls. The route id need not resolve -- the check asserts the head and tail of the
// line, not the route name.
export function probeRow(date = oneYearAgoISO()) {
  return { id: "anniv-probe", user_id: PROBE_UID, route_id: "anniv_probe_route", date_climbed: date, stars: 4, tick_type: "Lead", notes: "", cond_tags: [], photos: [], partners: [] };
}

const once = (code, anchor, why) => {
  const n = code.split(anchor).length - 1;
  if (n !== 1) {
    throw new Error("ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + anchor + "\nbut found " + n + ". " + why + " Update the anchor in scripts/anniversary.config.mjs.");
  }
};

function anniversaryScaffold() {
  return {
    name: "anniversary-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      // RouteDetail owns modals of its own, and no `?z=` injected into App can reach a
      // flag local to another component. Shared helper so no config can forget it.
      const _rd = routeDetailTransform(code, id, "check:anniversary");
      if (_rd !== null) return _rd;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;

      once(code, OPENER_ANCHOR, "Without the opener the notifications overlay never mounts, so this check would look at a bare tab and report green over nothing.");
      once(code, UID_ANCHOR, "Without a uid the browser is a guest, whose alerts are empty by design (#2789), and this check would fail as though the feature were broken.");
      once(code, LOGS_Q_ANCHOR, "Without it no dated climb_logs row reaches the hydration, no anniversary can fire, and this check would fail as though the feature were broken.");
      const row = probeRow();
      if (row.date_climbed !== oneYearAgoISO()) throw new Error("anniversary scaffold: the probe row is not dated one year ago today, so no anniversary could fire.");

      const { inject } = buildOpener(code, OPENER_ANCHOR, "check:anniversary");
      let out = code.replace(OPENER_ANCHOR, OPENER_ANCHOR + "\n  " + inject);
      out = out.replace(UID_ANCHOR, "const uid=USE_DB?" + JSON.stringify(PROBE_UID) + ":null;");
      // Prepend the probe once the account's own read has answered (or failed), so the
      // hydration -- which runs once, on the first data it sees -- receives the probe AND
      // whatever the account holds, exactly as it would receive a real climber's rows. Keyed
      // on the data, not the query object, so effects keyed on myLogsQ.data see a stable array.
      out = out.replace(LOGS_Q_ANCHOR, "const _myLogsQ=useUserLogs(uid);const _annivData=useMemo(()=>(_myLogsQ.data||_myLogsQ.isError)?[" + JSON.stringify(row) + "].concat(_myLogsQ.data||[]):undefined,[_myLogsQ.data,_myLogsQ.isError]);const myLogsQ=Object.assign({},_myLogsQ,{data:_annivData});");
      return out;
    },
  };
}

const WARM = lazyChunks("check:anniversary");
console.log("check:anniversary — signed in as a probe account whose climb_logs hold one ascent dated " + oneYearAgoISO() + "; warming " + WARM.length + " lazy chunk(s)");

export default {
  ...base,
  plugins: [anniversaryScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};

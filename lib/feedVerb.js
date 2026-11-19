/* WHAT A FRIEND-ACTIVITY ROW SAYS THE CLIMBER DID, in one place for all three feeds (Home's Recent friend
   activity, Crew › Friends' FriendsFeed, All friends' FriendsList). Each used to carry its own table and they
   disagreed: Home printed "Climbed" for a boulder Project and for a conditions-only report nobody climbed,
   and Crew › Friends printed "Climbed" for an Attempt and a Turned around.

   A Summit tick reads "climbed" (owner, 2026-11-18): the row names a ROUTE ("Summited Beckey Route (Southwest
   Face)"), and a route is climbed; it is the peak that is summited. Fell and Hung read "climbed" as well: the
   climber did the route, and the feed is not the place to announce the fall. Whether a party topped out is
   still told where it matters, on the trip report and the route's Recent outcomes. */
const VERB = {
  Onsight: "onsighted", Flash: "flashed", Redpoint: "redpointed", Send: "sent", Repeat: "repeated",
  Lead: "led", Follow: "followed", "Top-rope": "top-roped",
  Attempt: "tried", "Turned around": "turned around on", Project: "worked on",
  Conditions: "reported conditions on",
};

/**
 * @param {{ tickType?: string | null, scoutOnly?: boolean | null } | null | undefined} a a feed row's log
 * @returns {string} the lower-case verb phrase that goes before the route name
 */
export function feedVerb(a) {
  if (!a) return "climbed";
  if (a.scoutOnly || a.tickType === "Conditions") return VERB.Conditions;
  return (a.tickType && Object.prototype.hasOwnProperty.call(VERB, a.tickType) ? VERB[/** @type {keyof typeof VERB} */ (a.tickType)] : "") || "climbed";
}

/** The same phrase with its first letter raised, for a row that starts with it. */
export function feedVerbCap(a) {
  const v = feedVerb(a);
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/* WHICH KUDOS a row's button stands for. A real friend's log is keyed by the LOG; the old key was
   "name|route" for every row, so a friend who logged one route twice showed both rows as given after one
   tap, and tapping the second asked to take back a kudos that was never sent (the delete matched nothing
   and the toast said it could not be taken back). Example activity has no log id and keeps name|route. */
/**
 * @param {string} name
 * @param {string} route
 * @param {{ logId?: string | null } | null | undefined} target
 * @returns {string}
 */
export function kudosKey(name, route, target) {
  return target && target.logId ? "log|" + target.logId : name + "|" + route;
}

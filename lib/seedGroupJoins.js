// WHICH EXAMPLE GROUPS YOU JOINED, kept on this device.
//
// A real group's membership is a `group_members` row, and `useMyGroups` reads it back. The
// example groups (`GROUPS` in ClimbMatchCore, shown while DEMO_FILLERS is on) have no row to
// write: their ids are not uuids and they are not in the `groups` table. Their joined state
// lived only in React state, so it was gone after a reload -- and, worse, the my-groups
// hydration REPLACED `joinedGroups` with the server's list, so joining any real group (which
// refetches it) silently un-joined every example group too. The owner asked whether joining
// persists; this is the explicit persistence CLAUDE.md asks for before touching storage.
//
// Stored per account ("guest" when signed out), because two people can share a browser.
// The value is the full list of example-group ids you are in, so leaving the default group
// is remembered too. `null` means "never stored" and the caller keeps its default.

const KEY = "climbmatch-seed-group-joins.";

// localStorage throws in Safari private mode and when over quota; joining must not break on it.
export function loadSeedGroupJoins(uid) {
  try {
    const raw = localStorage.getItem(KEY + (uid || "guest"));
    if (raw == null) return null;
    const v = JSON.parse(raw);
    // Shape-checked on read: the key is user-writable and outlives deploys.
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export function saveSeedGroupJoins(uid, ids) {
  try {
    localStorage.setItem(KEY + (uid || "guest"), JSON.stringify(ids));
  } catch {
    /* a convenience, not a record: a failed write keeps today's in-memory state */
  }
}

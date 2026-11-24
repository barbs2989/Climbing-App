// A GUEST'S LISTS ARE KEPT ON THIS DEVICE (owner, 2026-11-24, "do what you recommend"): saving a climb
// signed out said "Saved on this device", and a list tap said "Added to … on this device", but both
// lived only in React state and were gone on the next reload. My Objectives and any list a guest
// makes are now written here and read back when the app opens.
//
// Only lists with no `_dbId` (the device's own) are kept; an account's lists are never written. The
// caller writes only while nobody is signed in and nobody has been this visit (ClimbMatch.jsx), so
// signing out on a shared phone cannot copy an account's objectives into the guest's lists.
// Storage that is blocked (a private window) or full is not an error: the lists then last the visit.
const KEY = "cm_guest_lists";

const isId = (x) => typeof x === "string" || typeof x === "number";

/** The guest's stored lists, or null when there are none (or they cannot be read). */
export function readGuestLists() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!Array.isArray(v)) return null;
    const lists = v.filter((l) => l && typeof l.id === "string" && typeof l.name === "string" && Array.isArray(l.routeIds))
      .map((l) => ({ id: l.id, name: l.name, icon: typeof l.icon === "string" ? l.icon : "", routeIds: l.routeIds.filter(isId), shared: !!l.shared }));
    return lists.some((l) => l.id === "ul_obj") ? lists : null;
  } catch {
    return null;
  }
}

/** Keep the device's own lists (no `_dbId`). */
export function writeGuestLists(lists) {
  try {
    const local = (lists || []).filter((l) => l && !l._dbId)
      .map((l) => ({ id: l.id, name: l.name, icon: l.icon || "", routeIds: (l.routeIds || []).filter(isId), shared: !!l.shared }));
    localStorage.setItem(KEY, JSON.stringify(local));
  } catch {
    /* storage blocked or full: the lists last this visit only */
  }
}

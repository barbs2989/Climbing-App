// Does a proposed field value TAKE SOMETHING OFF the page? The JS copy of the database's
// _edit_removes (0351) — the same three tests, nothing more:
//   the page holds something and the edit clears it; a list with fewer rows; a list whose rows
//   carry fewer map pins (lat + lng both set).
// 0351 runs that test once, when the edit is SENT. The page can change before anyone approves it
// (another approved edit adds two waypoints), and an edit that was an addition at send time is then
// a removal: approving it wipes the newer rows. So the Review desk and the review autopilot re-ask
// it against the page AS IT IS NOW (owner's note, 2026-10-22: "people shouldn't be able to delete
// waypoints when editing"), and 0553 refuses such an approval from anyone but the owner.
// Pure, no imports: the desk (browser) and scripts/review-queue-export.mjs (node) both load it.
const isEmpty = (v) => v == null
  || (typeof v === "string" && v.trim() === "")
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
const pins = (a) => a.filter((e) => e && typeof e === "object" && !Array.isArray(e)
  && e.lat != null && String(e.lat) !== "" && e.lng != null && String(e.lng) !== "").length;

export function editRemoves(cur, nxt) {
  if (isEmpty(cur)) return false;          // nothing on the page to lose
  if (isEmpty(nxt)) return true;           // clears the field
  if (Array.isArray(cur) && Array.isArray(nxt)) {
    if (nxt.length < cur.length) return true;
    if (pins(nxt) < pins(cur)) return true;
  }
  return false;
}

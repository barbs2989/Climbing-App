// DELETE ONE LOGBOOK ENTRY — a logged climb (or trip report) from `logs`, or a conditions report from
// `condReports`. ONE body for both doors to it: the log editor's "Delete this log" (LogClimbSheet) and the
// Logbook's swipe-left on a My ascents row (owner note 2026-11-26: "swipe to delete ... like how we have it
// on notifications"). It drops the row at once and, signed in, deletes the DB row; a REJECTED delete puts
// the entry back where it was and says so — a failed delete used to look identical to a successful one and
// the entry came back on the next refresh with no explanation.
import { deleteClimbLog } from "./db";
import { logHasReport } from "./logReport.js";

/**
 * @template T
 * @param {{ idx: number, scoutOnly: boolean, logs: T[], condReports: T[],
 *   setLogs: (f: (p: T[]) => T[]) => void, setCondReports: (f: (p: T[]) => T[]) => void,
 *   showToast: (t: string, d?: number) => void, uid: string | null | undefined }} o
 */
export function deleteLogEntry(o) {
  const idx = o.idx;
  const restore = function (setFn, item) {
    setFn(function (p) { const n = p.slice(); n.splice(Math.min(idx, n.length), 0, item); return n; });
    o.showToast("Couldn’t delete that — it’s still in your logbook. Try again.");
  };
  const list = o.scoutOnly ? o.condReports : o.logs, setFn = o.scoutOnly ? o.setCondReports : o.setLogs;
  const gone = list[idx];
  if (!gone) return;
  setFn(function (p) { return p.filter(function (_, k) { return k !== idx; }); });
  o.showToast(o.scoutOnly ? "Conditions report deleted" : logHasReport(gone) ? "Trip report deleted" : "Logged climb deleted");
  const dbId = /** @type {{ _dbId?: string | number | null }} */ (gone)._dbId;
  if (o.uid && dbId) deleteClimbLog(dbId).catch(function () { restore(setFn, gone); });
}

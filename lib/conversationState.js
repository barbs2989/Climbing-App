// What a climber did to a CONVERSATION in Messages: Archive, Mute, Mark as unread, Delete (0422).
//
// Messenger is the model climbers bring (owner 2026-11-14, "audit what Facebook does"):
//   Archive         the chat leaves the main list for "Archived chats" and comes back by itself when a NEW
//                   message arrives. Nothing is deleted.
//   Delete          deletes YOUR copy: every message up to now is hidden for you, the other side keeps theirs,
//                   and a later message starts the thread again with only what came after. Asks first.
//   Mute            no badge from this chat for 1 hour, 8 hours, 24 hours, or until you turn it back on. The
//                   chat stays in the list; its count is drawn grey.
//   Mark as unread  the chat counts as unread (a dot, and 1 on the badge) until you open it.
// Block and Restrict already exist (0088, 0270); the inbox's ⋯ reaches them from the thread too.
//
// Before this the inbox's swipe-left "delete" only removed the thread from React state, so the next load
// brought it all back: a delete that did not delete.
//
// Keys are the inbox's own ids: "dm:<partner id>" and "crew:<crew id>" (a saved crew's id is "db_<uuid>").
// Only a real account's thread is saved (a DM with a uuid partner, a crew with a db id, signed in); a seed
// demo thread is kept in memory for this visit, and the caller's toast says so.
import { useCallback, useMemo, useState } from "react";
import { useMyConversationState, setConversationState } from "./db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOREVER = "infinity";

const ms = function (v) { if (v == null) return 0; if (v === FOREVER || v === Infinity) return Infinity; const t = new Date(v).getTime(); return isNaN(t) ? 0 : t; };
const iso = function (n) { return !n ? null : n === Infinity ? FOREVER : new Date(n).toISOString(); };

export const dmKey = function (id) { return "dm:" + id; };
export const crewKey = function (id) { return "crew:" + id; };

// The database row a key saves to, or null when this thread is not one an account can keep.
export function savedTarget(key) {
  const i = key.indexOf(":"), kind = key.slice(0, i), id = key.slice(i + 1);
  if (kind === "dm" && UUID.test(id)) return { kind: "dm", id };
  if (kind === "crew" && id.indexOf("db_") === 0 && UUID.test(id.slice(3))) return { kind: "crew", id: id.slice(3) };
  return null;
}

// The four Mute lengths Messenger offers. `ms` null = until you turn it back on.
export const MUTE_CHOICES = [["1 hour", 3600e3], ["8 hours", 8 * 3600e3], ["24 hours", 24 * 3600e3], ["Until I turn it back on", null]];

export function useConversationState(uid) {
  const q = useMyConversationState(uid);
  // Local edits sit on top of the read: the change shows at once, and a seed thread or a guest keeps it for the visit.
  const [local, setLocal] = useState({});
  const saved = useMemo(function () {
    const out = {};
    (q.data || []).forEach(function (r) {
      const key = r.kind === "dm" ? dmKey(r.target_id) : crewKey("db_" + r.target_id);
      out[key] = { archivedAt: ms(r.archived_at), clearedBefore: ms(r.cleared_before), mutedUntil: ms(r.muted_until), markedUnread: !!r.marked_unread };
    });
    return out;
  }, [q.data]);
  const all = useMemo(function () {
    const out = Object.assign({}, saved);
    Object.keys(local).forEach(function (k) { out[k] = Object.assign({}, out[k] || {}, local[k]); });
    return out;
  }, [saved, local]);

  const get = useCallback(function (key) { return all[key] || {}; }, [all]);
  const isMuted = useCallback(function (key) { const t = (all[key] || {}).mutedUntil; return !!t && t > Date.now(); }, [all]);
  // Archived until a message NEWER than the archive arrives, as Messenger does.
  const isArchived = useCallback(function (key, lastTs) { const a = (all[key] || {}).archivedAt; return !!a && !((lastTs || 0) > a); }, [all]);
  const clearedBefore = useCallback(function (key) { return (all[key] || {}).clearedBefore || 0; }, [all]);
  const isMarkedUnread = useCallback(function (key) { return !!(all[key] || {}).markedUnread; }, [all]);

  // Change some of a thread's state. Resolves "saved" (on the account), "local" (this visit only), or
  // rejects after putting the thread back as it was, so the caller can say it did not save.
  const update = useCallback(function (key, patch) {
    const before = local[key];
    setLocal(function (l) { return Object.assign({}, l, { [key]: Object.assign({}, l[key] || {}, patch) }); });
    const t = uid ? savedTarget(key) : null;
    if (!t) return Promise.resolve("local");
    const row = {};
    if ("archivedAt" in patch) row.archived_at = iso(patch.archivedAt);
    if ("clearedBefore" in patch) row.cleared_before = iso(patch.clearedBefore);
    if ("mutedUntil" in patch) row.muted_until = iso(patch.mutedUntil);
    if ("markedUnread" in patch) row.marked_unread = !!patch.markedUnread;
    return setConversationState(t.kind, t.id, row).then(function () { return "saved"; }, function (e) {
      setLocal(function (l) { const n = Object.assign({}, l); if (before) n[key] = before; else delete n[key]; return n; });
      throw e;
    });
  }, [uid, local]);

  return { get, isMuted, isArchived, clearedBefore, isMarkedUnread, update, loaded: !uid || q.isSuccess, unavailable: !!uid && q.isError };
}

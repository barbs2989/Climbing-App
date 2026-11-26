// lib/db-comments.js — comments, their likes and reactions.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { inFilter, useLiveQuery } from "./live";

// ---------------------------------------------------------------------------
// Comments — route discussion and per-pitch beta (migration 0065).
//
// target_id is the app's existing addressing scheme, passed through unchanged:
// "<route_id>" for the route discussion, "<route_id>__planner" etc. per sub-tab,
// and "<route_id>_pitch_<n>" for one pitch. See 0065_comments.sql.
//
// Rows are returned already shaped for the Comments component: it expects
// `userId`, `ts`, `parentId`, `likedByMe`. The author's display name and avatar
// come from the joined profile, so a comment shows a real identity instead of a
// hardcoded "You".
// ---------------------------------------------------------------------------

// A `profiles` embed's PUBLIC name -- what pubName() gives in the app, for modules that read raw rows:
// the real name only if they chose to show it (show_name), else their handle, never a handle derived
// from the real name (the #1619 defect). Select `username, show_name` alongside `name` to use it.
export function publicNameOf(p, fallback) {
  if (p && p.show_name && p.name) return p.name;
  if (p && p.username) return "@" + p.username;
  return fallback || "Climber";
}

function dbCommentToCamel(row) {
  const p = row.profiles || {};
  return {
    id: row.id,
    targetId: row.target_id,
    userId: row.user_id,
    parentId: row.parent_id || undefined,
    text: row.deleted ? "" : row.text,
    edited: !!row.edited,
    deleted: !!row.deleted,
    likes: row.likes || 0,
    // 0263: "held"/"removed" rows reach only their author (RLS), who is told so beside it.
    moderation: row.moderation || "visible",
    ts: row.created_at,
    // { "<user uuid>": "<reaction key>" } — the same shape group-post reactions already
    // use, so reactionCounts() in ClimbMatchCore.jsx counts these without a translation
    // step. Absent when the row came back from a write that did not ask for the embed.
    reactions: (row.comment_reactions || []).reduce((o, r) => { o[r.user_id] = r.reaction; return o; }, {}),
    // The PUBLIC name: the real name only if they chose to show it, else their handle -- never a handle derived
    // from the real name (the #1619 defect). Every comment reader prints this.
    authorName: publicNameOf(p),
    authorAvatar: p.avatar || null,
    authorUsername: p.username || null,
  };
}

export async function fetchComments(targetIds) {
  if (!supabase) return [];
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("comments")
    // Reactions ride along as an embed rather than a second round trip: a comment's rows
    // are capped at one per climber (migration 0096) so this cannot fan out.
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,moderation,created_at,profiles(name:public_name,avatar,username,show_name),comment_reactions(user_id,reaction)")
    .in("target_id", ids)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(dbCommentToCamel);
}

// One query per route covering every surface at once — the six mount points share
// a route, so fetching them together avoids six round trips on one page.
//
// LIVE (lib/live.js): a comment or a reaction someone else writes on any of these targets
// refetches the query, so a thread fills in while you read it. Reactions are matched by
// the comment they hang on, against the comments already held.
export const heldIds = (data, id) => Array.isArray(data) && data.some((r) => r && r.id === id);
export function useComments(targetIds) {
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  const idSet = new Set(ids);
  return useLiveQuery({
    queryKey: ["comments", ids.slice().sort().join("|")],
    enabled: !!supabase && ids.length > 0,
    queryFn: () => fetchComments(ids),
  }, [
    { table: "comments", filter: inFilter("target_id", ids), match: (row) => idSet.has(row.target_id), cached: (old, data) => heldIds(data, old.id) },
    { table: "comment_reactions", match: (row, data) => heldIds(data, row.comment_id), cached: (old, data) => heldIds(data, old.comment_id) },
  ]);
}

// Every cached reader of comments, refreshed after each write to it (check:write-readers).
const commentsReaders = [["comments"]];
export async function addComment(targetId, userId, text, parentId = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ target_id: targetId, user_id: userId, text, parent_id: parentId })
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name:public_name,avatar,username,show_name)")
    .single();
  if (error) throw error;
  invalidateKeys(commentsReaders);
  return dbCommentToCamel(data);
}

export async function editComment(id, text) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments").update({ text, edited: true }).eq("id", id)
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name:public_name,avatar,username,show_name)")
    .single();
  if (error) throw error;
  invalidateKeys(commentsReaders);
  return dbCommentToCamel(data);
}

// A leaf is hard-deleted. A comment with replies is emptied and marked `deleted` instead (its
// author cannot delete other climbers' replies); the thread draws the replies and nothing for
// that row (owner, 2026-11-19: no "Comment deleted" line; 2026-11-23: the replies stay).
// Mirrors the in-memory version.
export async function deleteComment(id) {
  if (!supabase) return null;
  const { count, error: cErr } = await supabase
    .from("comments").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if (cErr) throw cErr;
  if ((count || 0) > 0) {
    const { error } = await supabase
      .from("comments").update({ deleted: true, text: "" }).eq("id", id);
    if (error) throw error;
    invalidateKeys(commentsReaders);
    return { id, tombstoned: true };
  }
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
  invalidateKeys(commentsReaders);
  return { id, tombstoned: false };
}

// Counter only — see the NOTE ON LIKES in 0065_comments.sql. This cannot tell who
// liked what, so the caller keeps the viewer's own like in local state and this
// just moves the shared number.
export async function setCommentLike(id, liked, current = 0) {
  if (!supabase) return null;
  const next = Math.max(0, current + (liked ? 1 : -1));
  const { data, error } = await supabase
    .from("comments").update({ likes: next }).eq("id", id).select("id,likes").single();
  if (error) throw error;
  invalidateKeys(commentsReaders);
  return data;
}

// Set, change, or clear this climber's reaction on one comment (migration 0096). Unlike
// `likes` above there is no counter to move: the row IS the reaction, so the count every
// reader sees is derived from rows and a client cannot inflate it.
//
// `reaction` of null clears — that is the UI's tap-the-one-you-already-gave toggle, and it
// is a delete rather than a third state so an aggregate never has to interpret an empty row.
export async function setCommentReaction(commentId, userId, reaction) {
  if (!supabase) return null;
  if (!reaction) {
    const { error } = await supabase.from("comment_reactions").delete()
      .eq("comment_id", commentId).eq("user_id", userId);
    if (error) throw error;
    return true;
  }
  // (comment_id, user_id) is the primary key, so changing your mind is an upsert on that
  // key rather than an insert that would collide with the reaction you already left.
  const { data, error } = await supabase.from("comment_reactions")
    .upsert({ comment_id: commentId, user_id: userId, reaction }, { onConflict: "comment_id,user_id" })
    .select().single();
  if (error) throw error;
  return data;
}

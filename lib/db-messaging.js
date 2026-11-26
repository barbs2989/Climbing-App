// lib/db-messaging.js — messages: chat videos, crew and direct messages, read state.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { PROFILE_NAME_COLS } from "./profileCols";

// Note: Trip report persistence uses climb_logs table (migration 0037).
// Crew persistence uses crews/crew_members/crew_day_acks tables (migration 0036).
// Enhanced climb_logs with fa_ascent/developed/beta fields (migration 0040).

// ── messaging ──



// ── chat videos (0539) ──
// A video sent in a DM or crew chat is a file in the PRIVATE `chat-videos` bucket, at
// {sender uid}/{uuid}.{ext}, named by the message row's `video_path`. Private because a DM is: the
// bucket's read policy lets a climber open an object only when a messages / crews_messages row they
// can already read names it (that table's own RLS, moderation hiding included, decides), or it is in
// their own folder. So the app reads a SIGNED url, never a public one. Photos stay data URLs in
// image_url, as they always were; a phone video is far too large for a row.
export const CHAT_VIDEO_MAX_BYTES = 50 * 1024 * 1024; // the bucket's limit; Supabase's Free-plan file cap
export const CHAT_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const CHAT_VIDEO_EXT = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
// Why a picked file cannot be sent, in words for the climber, or null when it can.
export function chatVideoProblem(file) {
  if (!file) return "No video was picked.";
  if (!CHAT_VIDEO_TYPES.includes(file.type)) return "That video format can't be sent — use an MP4, MOV or WebM video.";
  if (file.size > CHAT_VIDEO_MAX_BYTES) return "That video is " + Math.ceil(file.size / 1048576) + " MB; videos can be up to 50 MB. Trim it and try again.";
  return null;
}
export async function uploadChatVideo(file) {
  if (!supabase) return null;
  const problem = chatVideoProblem(file);
  if (problem) throw new Error(problem);
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to send a video.");
  const path = `${uid}/${crypto.randomUUID()}.${CHAT_VIDEO_EXT[file.type]}`;
  const { error } = await supabase.storage.from("chat-videos").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return path;
}
// A video whose message never landed is taken down again, so a refused send leaves no file behind.
async function removeChatVideo(path) {
  try { await supabase.storage.from("chat-videos").remove([path]); } catch (_e) { /* best effort: the refusal is what the climber is told about */ }
}
// A signed url for a stored chat video, good for an hour and re-signed before then.
export function useChatVideoUrl(path) {
  return useQuery({
    queryKey: ["chat-video-url", path],
    enabled: !!supabase && !!path,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("chat-videos").createSignedUrl(path, 3600);
      if (error) throw error;
      if (!data || !data.signedUrl) throw new Error("The video's address could not be resolved.");
      return data.signedUrl;
    },
  });
}

// Every cached reader of crews_messages, refreshed after each write to it (check:write-readers).
const crewsMessagesReaders = [["crew-messages"], ["crew-has-messages"]];
// Crew messaging
export async function sendCrewMessage(crewId, userId, body, imageUrl = null, videoPath = null) {
  if (!supabase) return null;
  const row = { crew_id: crewId, user_id: userId, body, image_url: imageUrl };
  if (videoPath) row.video_path = videoPath;
  const { data, error } = await supabase
    .from("crews_messages").insert(row)
    .select().single();
  if (error) { if (videoPath) await removeChatVideo(videoPath); throw error; }
  invalidateKeys(crewsMessagesReaders);
  return data;
}



// Every cached reader of messages, refreshed after each write to it (check:write-readers).
const messagesReaders = [["direct-messages"]];
// Direct messaging
export async function sendDirectMessage(recipientId, userId, body, imageUrl = null, videoPath = null) {
  if (!supabase) return null;
  const row = { sender_id: userId, recipient_id: recipientId, body, image_url: imageUrl };
  if (videoPath) row.video_path = videoPath;
  const { data, error } = await supabase
    .from("messages").insert(row)
    .select().single();
  if (error) { if (videoPath) await removeChatVideo(videoPath); throw error; }
  invalidateKeys(messagesReaders);
  return data;
}


// Paging BACKWARDS through history for "Load earlier messages".
// Not hooks -- these are called from click handlers, so they must be plain async.
// Keyset, not offset: `before` is the oldest locally-loaded message's timestamp
// (ms epoch or anything Date accepts); we fetch the `limit` rows strictly older
// than it, newest-first, then reverse to chronological for the UI. Offset paging
// double-counted against a shared scalar and skipped pages — and per this repo's
// convention, keyset can't skip or duplicate rows. Pass a falsy `before` for the
// newest page (initial hydration).
//
// THESE THROW ON A FAILED READ, and used to return []. Swallowing the error made a
// database failure indistinguishable from reaching the start of the conversation, and
// every caller drew the wrong conclusion from it: it set `crewMsgMore`/`dmMore` false —
// permanently hiding the "load older" control for that chat — and toasted "No earlier
// messages", a factual claim it had no evidence for. Each call site already had a
// `.catch` saying "Couldn't load earlier messages"; the swallow made that branch
// UNREACHABLE. An error handler nobody can reach, carrying the right wording, is the
// tell that the distinction was intended and lost.
//
// The old comment said returning [] stopped a failed page-load blanking the chat. That
// property is preserved, and it was never the return value doing the work: both paging
// callers catch, toast and reset their in-flight flag, and both hydration callers catch
// and do nothing. NO caller clears message state on rejection. Checked before changing
// this — the fear in that comment was not what the code did.
// `after` is the floor a Delete left (conversation_state.cleared_before, 0422): nothing at or before it is fetched.
export async function fetchOlderCrewMessages(crewId, limit = 50, before = null, after = null) {
  if (!supabase || !crewId) return [];
  let q = supabase
    .from("crews_messages").select(`*, user:user_id(${PROFILE_NAME_COLS})`)
    .eq("crew_id", crewId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  if (after) q = q.gt("created_at", new Date(after).toISOString());
  const { data, error } = await q;
  if (error) throw error;   // a failed read is not an empty page — see the note above (crew chat)
  return (data || []).reverse();
}

// Every DM thread for a user in one query: the latest `limit` messages either
// sent or received, oldest-first. The caller groups by partner id — this is how
// the inbox discovers threads started by someone the user never opened a chat with.
//
// Throws on a failed read, for the same reason the pagers above do, and this one is the
// worst of the three: [] here is what drives the Inbox's "No friend chats yet" empty state,
// so a transient database error told the user they had no conversations AND invited them to
// go start one. The caller sets its hydration guard BEFORE fetching, so that wrong answer
// then stood for the whole session — it never retried.
export async function fetchMyDirectMessages(userId, limit = 100) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("messages").select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;   // a failed read is not an empty inbox — see the note above
  return (data || []).reverse();
}

export async function fetchOlderDirectMessages(userId, otherUserId, limit = 50, before = null, after = null) {
  if (!supabase || !userId || !otherUserId) return [];
  let q = supabase
    .from("messages").select(`*, sender:sender_id(${PROFILE_NAME_COLS})`)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  if (after) q = q.gt("created_at", new Date(after).toISOString());   // a Delete's floor (0422)
  const { data, error } = await q;
  if (error) throw error;   // a failed read is not an empty page — see the note above
  return (data || []).reverse();
}


// Mark every unread message from one partner as read (RLS: recipient may update).
export async function markDmThreadRead(userId, partnerId) {
  if (!supabase) return;
  await supabase.from("messages").update({ read: true })
    .eq("recipient_id", userId).eq("sender_id", partnerId).eq("read", false);
  invalidateKeys(messagesReaders);
}

// Crew chats have no per-message read flag; crew_reads (migration 0072) holds a
// per-member last-read watermark instead. Returns null when the table is absent
// so callers can skip crew unread entirely rather than badge on stale data.
export async function fetchCrewLastReads(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_reads").select("crew_id,last_read_at").eq("user_id", userId);
  if (error) throw error; // a failed read is not "never read anything"; the caller sets crewUnreadUnavailable
  return data || [];
}

export async function countCrewUnread(crewId, userId, sinceIso) {
  if (!supabase) return 0;
  let q = supabase.from("crews_messages").select("id", { count: "exact", head: true })
    .eq("crew_id", crewId).neq("user_id", userId);
  if (sinceIso) q = q.gt("created_at", sinceIso);
  const { count, error } = await q;
  if (error) throw error; // 0 on error read as "nothing new" — the shape check:read-failures forbids
  return count || 0;
}

export async function markCrewRead(crewId, userId) {
  if (!supabase) return;
  await supabase.from("crew_reads")
    .upsert({ crew_id: crewId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "crew_id,user_id" });
}

// A conversation's Archive / Mute / Mark as unread / Delete (0422) and a message request's Accept (0546) -- the caller's own filing only: one row per
// climber per conversation (kind 'dm' + the other climber's id, or 'crew' + the crew's id), readable by that
// climber alone. lib/conversationState.js turns the rows into what the inbox and the badges show.
const conversationStateReaders = [["conversation-state"]];
export function useMyConversationState(userId) {
  return useQuery({
    queryKey: ["conversation-state", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("conversation_state")
        .select("kind,target_id,archived_at,cleared_before,muted_until,marked_unread,accepted_at");
      if (error) throw error;   // a failed read is not "nothing archived" -- the caller keeps what it had
      return data || [];
    },
  });
}
// `patch` holds only the columns to change. The write .select()s, so a refused write throws rather than
// reading as saved.
export async function setConversationState(kind, targetId, patch) {
  if (!supabase) return;
  const { data, error } = await supabase.from("conversation_state")
    .upsert({ kind, target_id: targetId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id,kind,target_id" })
    .select("target_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — sign in again and retry.");
  invalidateKeys(conversationStateReaders);
}

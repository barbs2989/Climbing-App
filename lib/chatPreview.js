// What a conversation's row in Messages says about its newest message: ONE short line.
//
// The row used to print the message verbatim, wrapping anywhere. A shared climb, list or post arrives as a few
// lines of text and a long address into this app, so a Message requests row from someone who shared a link was a
// block of wrapped URL several lines tall (owner note 2026-11-26: "there's a bunch of text on that page when
// someone posts a link, it needs to look cleaner"). Messenger's row is one line ending in "…", and a link reads as
// what it is. So here: line breaks fold into " · ", an address into this app becomes what it opens (the thread
// itself still shows the tappable "Open the climb ›"), any other address shrinks to its site name, and the row's
// style clips the rest with an ellipsis (PREVIEW_LINE).
import { appLink } from "../ClimbMatchCore.jsx";

const URL_RE = /https?:\/\/[^\s<>"]+/g;

// What an address into the app opens, as the thread's own link label names it (chatText in ClimbMatchCore.jsx).
function appTarget(u) {
  try {
    const p = new URL(u).searchParams;
    if (p.get("group")) return p.get("post") ? "a post" : "a group";
    if (p.get("route")) return "a climb";
    if (p.get("list")) return "a list";
    if (p.get("report")) return "a trip report";
  } catch (e) { /* not a URL after all: fall through to "a link" */ }
  return "a link";
}
function host(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "a link"; }
}

// `m` is a thread message ({from, text, image, video, videoPath}); null when the thread has none loaded.
export function previewText(m) {
  if (!m) return null;
  const you = m.from === "me" ? "You: " : "";
  if (m.image) return you + "Photo";
  if (m.video || m.videoPath) return you + "Video";
  const raw = String(m.text || "");
  const base = appLink("");
  let shared = null;
  let t = raw.replace(URL_RE, function (u0) {
    const u = u0.replace(/[.,!?;:)]+$/, "");
    if (base && u.indexOf(base) === 0) { shared = shared || appTarget(u); return ""; }
    return host(u) + u0.slice(u.length);
  });
  t = t.split(/\n+/).map(function (s) { return s.replace(/\s+/g, " ").trim().replace(/[:\-–—]$/, "").trim(); }).filter(Boolean).join(" · ");
  if (shared) t = t ? "Shared " + shared + ": " + t : "Shared " + shared;
  return t ? you + t : null;
}

// The style that keeps the preview to one line, cut with "…".
export const PREVIEW_LINE = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// Is this direct chat a MESSAGE REQUEST (0546)? Only when the climber sends non-friends to Message requests, and
// only until they accept it or reply: a friend, a confirmed crewmate, an accepted chat, or one where you have
// written back is a chat. Restricted chats are Message requests whatever this says (0270); the caller adds those.
export function isMessageRequest({ msgFrom, isFriend, isCrewMate, accepted, iReplied }) {
  return msgFrom === "requests" && !isFriend && !isCrewMate && !accepted && !iReplied;
}

// The Menu's Feedback and Rate app sheets (0365), and the owner's queue that reads them.
//
// Before this, Feedback copied the climber's note to their clipboard and said "nothing here is sent
// anywhere", and Rate app drew five stars, thanked a 4-5 star climber "for rating", and recorded
// nothing -- ClimbMatch is a web app, so there was no store to send a rating to either. The owner
// asked for both to actually work (2026-10-24). Both now file through file_app_feedback().
//
// THE STORE LINK IS NEVER GATED ON THE STARS. Apple (App Review Guideline 5.6.1) and Google Play
// both forbid "review gating": asking how a climber feels and sending only the happy ones to the
// store. The old sheet did exactly that shape (4-5 stars: thanks; 1-3: send feedback). So when a store
// listing exists for the device you are on, its button shows first, to everyone, before any stars;
// the in-app stars are a separate, private rating to the team. With no listing configured
// (VITE_APP_STORE_ID / VITE_PLAY_STORE_ID unset, as today) no store is named at all.
//
// Same invariant as the sheets these replace: never clear what was typed unless it was saved,
// never claim a delivery that did not happen.

import { useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { fileAppFeedback, useAppFeedbackQueue, useAppRatingSummary, setAppFeedbackStatus } from "./db.js";
import pkg from "../package.json";
import LoadingRows from "../src/components/LoadingRows.tsx";

export const APP_VERSION = pkg.version;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Which device this is, in the store's terms. A Trusted Web Activity (the Play Store wrapper for a
// web app) opens with an android-app:// referrer; iPadOS 13+ reports itself as a Mac with touch.
export function devicePlatform() {
  try {
    const ua = navigator.userAgent || "";
    if (/android-app:\/\//.test(document.referrer || "") || /Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
    return "web";
  } catch (_e) {
    return "web";
  }
}

// The store listing for THIS device, or null. Apple's write-review action opens the review sheet
// directly; Play has no equivalent deep link, so its listing page is where the rating lives.
export function storeListing(platform) {
  const env = import.meta.env || {};
  if (platform === "ios" && env.VITE_APP_STORE_ID) return { name: "the App Store", url: "https://apps.apple.com/app/id" + env.VITE_APP_STORE_ID + "?action=write-review" };
  if (platform === "android" && env.VITE_PLAY_STORE_ID) return { name: "Google Play", url: "https://play.google.com/store/apps/details?id=" + env.VITE_PLAY_STORE_ID + "&showAllReviews=true" };
  return null;
}

const field = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.textSub, margin: "12px 0 5px" };
const primary = (on) => ({ width: "100%", marginTop: 14, padding: 12, minHeight: 46, background: on ? C.blueSolid : C.bg, color: on ? C.onSolid : C.textMuted, border: on ? "none" : "1px solid " + C.border, borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: on ? "pointer" : "default" });
const why = (e) => (e && e.code === "P0001" && e.message ? e.message + " " : "");

function GuestEmail({ id, email, setEmail }) {
  return <>
    <label htmlFor={id} style={lbl}>Your email (optional)</label>
    <input id={id} aria-label="Your email (optional)" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={320} aria-describedby={id + "-use"} style={field} />
    <div id={id + "-use"} style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 4 }}>Only if you’d like a reply. We use it for nothing else.</div>
  </>;
}

const KINDS = [["bug", "Something’s broken"], ["idea", "An idea"], ["other", "Something else"]];

export function FeedbackForm({ uid }) {
  const [kind, setKind] = useState("bug"), [text, setText] = useState(""), [email, setEmail] = useState(""), [state, setState] = useState("idle"), [msg, setMsg] = useState("");
  const emailOk = !!uid || !email.trim() || EMAIL_RE.test(email.trim());
  const ready = !!text.trim() && emailOk && state !== "sending";
  const send = () => {
    if (!ready) return;
    setState("sending"); setMsg("");
    fileAppFeedback({ kind, message: text, email: uid ? "" : email, platform: devicePlatform(), version: APP_VERSION }).then((r) => {
      if (r === "recorded") { setText(""); setEmail(""); setState("sent"); } else setState("failed");
    }, (e) => { setMsg(why(e)); setState("failed"); });
  };
  // Copying is the fallback when sending failed, so the note is never lost.
  const copy = () => { try { navigator.clipboard.writeText(text).then(() => setMsg("Copied to your clipboard. "), () => setMsg("Couldn’t copy — your browser blocked clipboard access. ")); } catch (_e) { setMsg("Couldn’t copy — your browser blocked clipboard access. "); } };
  return <form onSubmit={(e) => { e.preventDefault(); send(); }} aria-label="Send feedback">
    <div style={{ fontSize: 13, color: C.textSub, marginBottom: 12, lineHeight: 1.5 }}>Found a bug or have an idea? It goes straight to the ClimbMatch team, and we read every one.</div>
    <div role="radiogroup" aria-label="What is it about" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {KINDS.map(([k, label]) => <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} style={{ minHeight: 40, padding: "8px 13px", borderRadius: 20, border: "1px solid " + (kind === k ? C.blue : C.border), background: kind === k ? C.blueBg : C.bg, color: kind === k ? C.onSolid : C.textSub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{label}</button>)}
    </div>
    <label htmlFor="fb-text" style={lbl}>{kind === "bug" ? "What happened, and on which screen?" : kind === "idea" ? "What would make ClimbMatch better?" : "What’s on your mind?"}</label>
    <textarea id="fb-text" value={text} onChange={(e) => { setText(e.target.value); if (state !== "sending") setState("idle"); }} rows={5} maxLength={4000} style={{ ...field, resize: "vertical" }} />
    {uid ? null : <GuestEmail id="fb-email" email={email} setEmail={setEmail} />}
    <button type="submit" disabled={!ready} style={primary(ready)}>{state === "sending" ? "Sending…" : "Send feedback"}</button>
    {state === "failed" && text.trim() ? <button type="button" onClick={copy} style={{ width: "100%", marginTop: 8, padding: 10, minHeight: 44, background: "transparent", color: C.blue, border: "1px solid " + C.blue, borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Copy my note</button> : null}
    <div role={state === "failed" ? "alert" : "status"} style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: state === "sent" || state === "failed" || msg ? 9 : 0, color: state === "failed" ? C.red : C.green }}>
      {state === "sent" ? (uid ? "Sent — thank you. If we need to ask you something, we’ll write to the email on your account." : "Sent — thank you.") : state === "failed" ? msg + "Couldn’t send that — nothing was saved. Your note is still here; try again." : msg}
    </div>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 10 }}>{"We attach your device type and the app version (" + APP_VERSION + ") so we can find the problem."}</div>
  </form>;
}

export function RateForm({ uid, onFeedback }) {
  const [stars, setStars] = useState(0), [text, setText] = useState(""), [state, setState] = useState("idle"), [msg, setMsg] = useState("");
  const platform = devicePlatform(), store = storeListing(platform);
  const ready = stars > 0 && state !== "sending";
  const send = () => {
    if (!ready) return;
    setState("sending"); setMsg("");
    fileAppFeedback({ kind: "rating", stars, message: text, platform, version: APP_VERSION }).then((r) => {
      if (r === "recorded") { setText(""); setState("sent"); } else setState("failed");
    }, (e) => { setMsg(why(e)); setState("failed"); });
  };
  // Arrow keys move the choice, as a radio group does.
  const key = (e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setStars(Math.min(5, stars + 1)); } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setStars(Math.max(1, stars - 1)); } };
  if (state === "sent") return <div role="status" style={{ textAlign: "center", padding: "6px 0 2px" }}>
    <div aria-hidden="true" style={{ fontSize: 30, color: "#e3b341", letterSpacing: 4 }}>{"★".repeat(stars)}</div>
    <div style={{ fontSize: 14, color: C.text, fontWeight: 700, marginTop: 8 }}>Thanks — your rating reached the ClimbMatch team.</div>
    {uid ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>Rate again any time; your newest rating replaces this one.</div> : null}
    {onFeedback ? <button type="button" onClick={onFeedback} style={{ marginTop: 12, padding: "9px 14px", minHeight: 44, background: "transparent", color: C.blue, border: "1px solid " + C.blue, borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Tell us more in Feedback</button> : null}
  </div>;
  return <form onSubmit={(e) => { e.preventDefault(); send(); }} aria-label="Rate ClimbMatch">
    {store ? <>
      <a href={store.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, padding: 12, background: C.blueSolid, color:C.onSolid, borderRadius: 11, fontSize: 14, fontWeight: 700, textDecoration: "none", boxSizing: "border-box" }}>{"Rate us on " + store.name}</a>
      <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, margin: "10px 0 4px" }}>{"A rating on " + store.name + " helps other climbers find ClimbMatch. Or rate us here — that one comes only to the team."}</div>
    </> : <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginBottom: 4 }}>How is ClimbMatch working for you? Your rating goes straight to the ClimbMatch team.</div>}
    <div role="radiogroup" aria-label="Your rating, out of 5 stars" onKeyDown={key} style={{ display: "flex", justifyContent: "center", gap: 4, margin: "10px 0 2px" }}>
      {[1, 2, 3, 4, 5].map((s) => <button key={s} type="button" role="radio" aria-checked={stars === s} aria-label={s + (s === 1 ? " star" : " stars")} tabIndex={stars === s || (!stars && s === 1) ? 0 : -1} onClick={() => setStars(s)} style={{ width: 52, height: 52, padding: 0, border: "none", background: "transparent", fontSize: 40, lineHeight: 1, cursor: "pointer", color: s <= stars ? "#e3b341" : C.textMuted, opacity: s <= stars ? 1 : 0.55 }}>★</button>)}
    </div>
    <div aria-hidden="true" style={{ textAlign: "center", fontSize: 12.5, color: C.textMuted, minHeight: 18 }}>{["Tap a star", "Poor", "Fair", "Good", "Very good", "Excellent"][stars]}</div>
    {stars ? <>
      <label htmlFor="rate-text" style={lbl}>{stars <= 3 ? "What would make it better? (optional)" : "Anything you’d like to add? (optional)"}</label>
      <textarea id="rate-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} style={{ ...field, resize: "vertical" }} />
    </> : null}
    <button type="submit" disabled={!ready} style={primary(ready)}>{state === "sending" ? "Sending…" : "Send rating"}</button>
    <div role={state === "failed" ? "alert" : "status"} style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: state === "failed" ? 9 : 0, color: C.red }}>{state === "failed" ? msg + "Couldn’t send your rating — nothing was saved. Please try again." : ""}</div>
    {uid ? null : <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 10 }}>You don’t need an account to rate.</div>}
  </form>;
}

const WAITED = (iso) => {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h < 1 ? "under an hour ago" : h < 48 ? Math.floor(h) + " h ago" : Math.floor(h / 24) + " days ago";
};
const KIND_LABEL = { bug: "Bug", idea: "Idea", other: "Other", rating: "Rating" };

// Gated on useIsAdmin by the caller, as the other queues are; the functions refuse a non-admin by themselves.
export function AppFeedbackQueue({ notify }) {
  const { data, isLoading, error } = useAppFeedbackQueue(true, "open");
  const sum = useAppRatingSummary(true);
  const [busy, setBusy] = useState(null);
  const s = sum.data;
  const summary = sum.isLoading ? "Loading ratings…" : sum.error ? "Couldn’t load the app rating — do not read this as 'no ratings'." : !s || !Number(s.ratings) ? "Nobody has rated the app yet." : "App rating " + Number(s.average).toFixed(1) + " ★ from " + s.ratings + (Number(s.ratings) === 1 ? " climber" : " climbers") + " · " + [5, 4, 3, 2, 1].map((n) => n + "★ " + s[["", "one", "two", "three", "four", "five"][n]]).join(" · ");
  const done = (r) => {
    setBusy(r.id);
    setAppFeedbackStatus(r.id, "done")
      .then(() => notify && notify("Marked as read."))
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ fontSize: 12.5, color: sum.error ? C.red : C.textSub, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", lineHeight: 1.5 }}>{summary}</div>
    {isLoading ? <LoadingRows C={C} label="Loading feedback…" style={{padding: "10px 2px"}}/>
      : error ? <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load feedback — " + ((error && error.message) || "try again") + ". Do not read this as 'no feedback'."}</div>
      : !data || !data.length ? <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No unread feedback.</div>
      : data.map((r) => {
        const mail = r.reply_to ? "mailto:" + encodeURIComponent(r.reply_to) + "?subject=" + encodeURIComponent("Your ClimbMatch feedback") : null;
        return <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 0.3 }}>{KIND_LABEL[r.kind] || r.kind}{r.stars ? " · " + r.stars + "★" : ""}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.from_guest ? "From a visitor (not signed in)" : "From " + (r.sender_name || "a climber")}</span>
            <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: "auto" }}>{WAITED(r.created_at)}</span>
          </div>
          {r.message ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{r.message}</div> : null}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{[r.platform, r.app_version ? "v" + r.app_version : null, r.reply_to ? "Reply to " + r.reply_to : "No address to reply to"].filter(Boolean).join(" · ")}</div>
          <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            {mail ? <a href={mail} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.blueDim, background: C.blueBg, color:C.onSolid, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Reply by email</a> : null}
            <button disabled={busy === r.id} onClick={() => done(r)} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: busy === r.id ? "default" : "pointer" }}>{busy === r.id ? "Working…" : "Mark as read"}</button>
          </div>
        </div>;
      })}
  </div>;
}

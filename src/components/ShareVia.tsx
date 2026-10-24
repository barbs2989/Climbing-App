import type { CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface ShareViaProps {
  /** The subject line of an email, and the share sheet's title. */
  title: string;
  /** The whole message: what goes into the text or the email body. It carries the link. */
  text: string;
  /** The link alone, for Copy link. */
  link: string;
  /** Says what happened (copied, or the browser refused). */
  onToast: (msg: string) => void;
}

/** SEND IT ANOTHER WAY, to someone who may not have the app: Text, Email, Copy link, and the phone's own share sheet (More…) where there is one. AllTrails' trail Share offers the same four (Copy link · Text · Email · Embed); the message carries a link that opens the climb or list for anyone, signed in or not. */
export default function ShareVia({ title, text, link, onToast }: ShareViaProps) {
  const tile: CSSProperties = { flex: 1, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 6px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "none", boxSizing: "border-box" };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const copy = function () {
    const no = function () { onToast("Couldn’t copy — your browser blocked clipboard access"); };
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(link);
      if (p) p.then(function () { onToast("Link copied — paste it into a text, an email or a chat"); }, no); else no();
    } catch (_e) { no(); }
  };
  const more = function () {
    navigator.share({ title: title, text: text }).catch(function (e: unknown) { if (e && (e as { name?: string }).name === "AbortError") return; copy(); });
  };
  return (
    <div style={{ display: "flex", gap: 7 }}>
      {/* `sms:?&body=` is the form both iOS and Android Messages read. */}
      <a href={"sms:?&body=" + encodeURIComponent(text)} aria-label={"Send " + title + " by text message"} style={tile}>{"Text"}</a>
      <a href={"mailto:?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text)} aria-label={"Send " + title + " by email"} style={tile}>{"Email"}</a>
      <button onClick={copy} aria-label={"Copy the link to " + title} style={tile}>{"Copy link"}</button>
      {canShare ? <button onClick={more} aria-label={"More ways to share " + title} style={tile}>{"More…"}</button> : null}
    </div>
  );
}

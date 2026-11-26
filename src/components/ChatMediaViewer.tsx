import { useEffect } from "react";
import { createPortal } from "react-dom";
import { C, photoAlt } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import TopoZoomPhoto from "./TopoZoomPhoto.tsx";
import { safeHref } from "../../lib/safeUrl.js";

/** A photo or video sent in a chat, opened full screen. */
export interface ChatMedia {
  kind: "image" | "video";
  /** A data URL, an object URL, or a (signed) storage URL. */
  src: string;
  /** The sender's description of it, when they wrote one. */
  alt?: string | null;
  /** Who sent it, for the line under it ("You", or the sender's name). */
  by?: string | null;
}
export interface ChatMediaViewerProps {
  media: ChatMedia;
  onClose: () => void;
}

/**
 * A photo or video from a DM or crew chat, full screen (owner's note, 2026-11-25: "everyone should be
 * able to click on it to see it full screen"). The photo pinches, double-taps and +/− zooms through the
 * topo viewer's own frame; a video plays with the browser's controls, inline on iOS. Closes on its ✕ or
 * Escape; the backdrop is not a control, as in the area photo viewer, so a pinch that strays off the photo
 * does not throw it away. Save hands the file to the device.
 */
export default function ChatMediaViewer({ media, onClose }: ChatMediaViewerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const video = media.kind === "video";
  const what = video ? "Video" : "Photo";
  const desc = media.alt && media.alt.trim() ? media.alt.trim() : null;
  return createPortal(<div role="dialog" aria-modal="true" aria-label={what + " viewer"} data-sheet="viewer" style={{ position: "fixed", inset: 0, background: C.scrimStrong, zIndex: 99999, display: "flex", justifyContent: "center", overscrollBehavior: "contain" }}>
    <div style={{ position: "relative", width: "100%", maxWidth: 520, margin: "0 auto", boxSizing: "border-box", height: "100%", background: "#000", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, padding: "64px 0 20px" }}>
      {video
        ? <video src={media.src} controls autoPlay playsInline preload="metadata" aria-label={desc ? "Video: " + desc : (media.by ? "Video from " + media.by : "Video sent in this chat")} style={{ width: "100%", maxHeight: "74vh", background: "#000", display: "block" }} />
        : <TopoZoomPhoto photo={{ url: media.src, alt: photoAlt(desc, media.by ? "Photo from " + media.by : "Photo sent in this chat") }} active={null} label="Chat photo" maxHeight="74vh" />}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", color: "#fff", fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {media.by ? <div style={{ fontWeight: 700 }}>{what + " from " + media.by}</div> : null}
          {desc ? <div style={{ opacity: 0.85, overflowWrap: "anywhere" }}>{desc}</div> : null}
        </div>
        <a href={safeHref(media.src)} download={video ? "climbmatch-video" : "climbmatch-photo"} target="_blank" rel="noreferrer" style={{ flexShrink: 0, minHeight: 40, display: "inline-flex", alignItems: "center", padding: "0 14px", borderRadius: 9, border: "1px solid " + C.blue, background: C.blueBg, color: C.onSolid, fontWeight: 700, textDecoration: "none" }}>{"Save"}</a>
      </div>
      <button onClick={onClose} style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 16, right: 16 })} aria-label={"Close " + what.toLowerCase()}>{"✕"}</button>
    </div>
  </div>, document.body);
}

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAreaPhotoFeed, uploadAreaPhoto } from "../../lib/db";
import { photoThumb } from "../../lib/photoThumb";
import { POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import { clickable } from "../../lib/clickable";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

/** An area_photo_feed row (0411) with its public URL. */
export interface AreaFeedPhoto { id: string; url: string | null; alt?: string | null; route_id?: string | null; route_name?: string | null; area_id: string; area_name?: string | null; created_at: string }
export interface AreaPhotoStripProps {
  area: { id: string; name: string };
  C: typeof Palette;
  /** Signed in: the Add tile uploads. Signed out: it asks to sign in. */
  signedIn: boolean;
  onSignIn?: () => void;
  /** Opens the climb a route photo was posted on. */
  onOpenRoute?: (r: { id: string; name?: string }) => void;
}

const THUMB = 64;

// PHOTOS, as one thin line (owner, 2026-11-11: "a thin line for photos that can be uploaded and feed photos that
// people uploaded for photos within that hierarchy tree"). Mountain Project puts a large photo grid near the bottom
// of its area pages; here it is a 64px strip, the area's own photos and every route photo under it, newest first.
// Tapping one opens it full size, naming where it was taken, with a way to the climb it came from.
export default function AreaPhotoStrip({ area, C, signedIn, onSignIn, onOpenRoute }: AreaPhotoStripProps) {
  const feed = useAreaPhotoFeed(area.id);
  const [view, setView] = useState<AreaFeedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // The viewer closes on Escape or its ✕ (the backdrop is not a control).
  useEffect(() => {
    if (!view) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setView(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);
  const photos: AreaFeedPhoto[] = ((feed.data || []) as AreaFeedPhoto[]).filter(p => !!p.url);
  const add = (f: File) => {
    setBusy(true); setErr(null);
    uploadAreaPhoto(area.id, f, null).then(() => feed.refetch(), (e: unknown) => setErr(e instanceof Error && e.message ? e.message : "Couldn't add the photo — try again.")).finally(() => setBusy(false));
  };
  const tile = { width: THUMB, height: THUMB, borderRadius: 8, flexShrink: 0, boxSizing: "border-box" as const };
  return <div style={{ padding: "10px 14px", borderTop: "1px solid " + C.border }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{"Photos" + (photos.length ? " · " + photos.length + (photos.length >= 40 ? "+" : "") : "")}</h2>
      {feed.error && !feed.data ? <span style={{ fontSize: 11.5, color: C.textMuted }}>{"Couldn't load photos"}</span> : null}
    </div>
    {err ? <div role="alert" style={{ fontSize: 12, color: C.red, marginBottom: 6, lineHeight: 1.4 }}>{err}</div> : null}
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
      {signedIn
        ? <label aria-label={"Add a photo of " + area.name} style={{ ...tile, border: "1.5px dashed " + C.border, background: C.surface, color: busy ? C.blue : C.textMuted, fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{busy ? "…" : "+"}</span>{busy ? "Adding" : "Add"}
            <input type="file" accept="image/*" disabled={busy} onChange={e => { const f = e.target.files && e.target.files[0]; if (f) add(f); e.target.value = ""; }} className="cm-file-input" />
          </label>
        : <button onClick={onSignIn} aria-label="Sign in to add a photo" style={{ ...tile, border: "1.5px dashed " + C.border, background: C.surface, color: C.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"+ Add"}</button>}
      {photos.map((p, i) => <img key={p.id} loading="lazy" decoding="async" src={photoThumb(p.url as string, 150)} alt="" {...clickable(() => setView(p))} aria-label={"Open photo " + (i + 1) + (p.route_name ? " from " + p.route_name : p.area_name ? " of " + p.area_name : "") + (p.alt ? ": " + p.alt : "")} style={{ ...tile, objectFit: "cover", border: "1px solid " + C.border, cursor: "pointer" }} />)}
      {feed.data && !photos.length ? <div style={{ alignSelf: "center", fontSize: 12, color: C.textMuted, paddingLeft: 4 }}>{"No photos here yet."}</div> : null}
    </div>
    {view ? createPortal(<div role="dialog" aria-label="Photo viewer" aria-modal="true" data-sheet="viewer" style={{ position: "fixed", inset: 0, background: C.scrimStrong, zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 12 }}>
      <img src={view.url as string} alt={view.alt || "Photo of " + (view.route_name || view.area_name || area.name)} style={{ maxWidth: "100%", maxHeight: "78%", borderRadius: 12, objectFit: "contain" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", color: "#fff", fontSize: 13 }}>
        <span>{view.route_name ? view.route_name + (view.area_name ? " · " + view.area_name : "") : view.area_name || area.name}</span>
        {view.route_id && onOpenRoute ? <button onClick={() => { const r = { id: view.route_id as string, name: view.route_name || undefined }; setView(null); onOpenRoute(r); }} style={{ minHeight: 40, padding: "0 14px", borderRadius: 9, border: "1px solid " + C.blue, background: C.blueBg, color: C.onSolid, fontWeight: 700, cursor: "pointer" }}>Open climb</button> : null}
      </div>
      <button onClick={() => setView(null)} style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 16, right: 16 })} aria-label="Close">✕</button>
    </div>, document.body) : null}
  </div>;
}

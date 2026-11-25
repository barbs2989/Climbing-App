import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { uploadGroupPhoto } from "../../lib/db";
import { photoThumb, thumbFallback } from "../../lib/photoThumb";

/** Which of a group's two pictures (0454). */
type Slot = "avatar" | "cover";

interface GroupPhotoFieldsProps {
  /** The group's name, for the initial drawn when it has no avatar. */
  name: string;
  /** The current pictures; "" means none (the drawn initial / colour band). */
  avatarUrl: string;
  coverUrl: string;
  /** The signed-in account, or null for a guest, whose group lives only on this device. */
  uid: string | null;
  /** Hands a changed picture back to the form's draft; it is saved with the form. */
  onChange: (patch: { avatarUrl?: string; coverUrl?: string }) => void;
  showToast: (msg: string, ms?: number) => void;
}

/* A GROUP'S OWN AVATAR AND COVER (owner 2026-11-18). Picking a file uploads it straight away
   (uploadGroupPhoto: the camera's location stripped, scaled to screen size) and puts its address in
   the form's draft; the group row takes it when the form is saved, so Cancel keeps the old picture.
   Remove sets "", which saves as null: back to the initial and the colour band. A guest's group exists
   only on this device, so a guest's pick is a local preview, as the guest profile photo is. */
export default function GroupPhotoFields({ name, avatarUrl, coverUrl, uid, onChange, showToast }: GroupPhotoFieldsProps) {
  const [busy, setBusy] = useState<Slot | null>(null);
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  const pick = (slot: Slot) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const put = (url: string) => onChange(slot === "avatar" ? { avatarUrl: url } : { coverUrl: url });
    if (!uid) { put(URL.createObjectURL(f)); showToast("Photo added on this device — sign in to keep it"); return; }
    setBusy(slot);
    uploadGroupPhoto(f).then((url: string | null) => {
      setBusy(null);
      if (url) put(url);
    }).catch((err: unknown) => {
      setBusy(null);
      showToast((err instanceof Error && err.message) || "Couldn’t upload that photo. Check your connection and try again.", 3600);
    });
  };
  const btn = { minHeight: 44, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" as const, boxSizing: "border-box" as const };
  const chooser = (slot: Slot, has: boolean, what: string): ReactNode => {
    const up = busy === slot;
    return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label style={{ ...btn, border: "1px solid " + C.border, background: C.surface, color: up ? C.textMuted : C.text, cursor: up ? "default" : "pointer" }}>
        {up ? "Uploading…" : has ? "Change " + what : "Add " + what}
        <input type="file" accept="image/*" disabled={busy !== null} className="cm-file-input" aria-label={up ? "Uploading the group’s " + what : (has ? "Change" : "Add") + " the group’s " + what} onChange={pick(slot)} />
      </label>
      {has && !up ? <button type="button" onClick={() => onChange(slot === "avatar" ? { avatarUrl: "" } : { coverUrl: "" })} aria-label={"Remove the group’s " + what} style={{ ...btn, border: "1px solid " + C.border, background: "transparent", color: C.textSub }}>Remove</button> : null}
    </div>;
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div>
      <div aria-hidden="true" style={{ height: 96, borderRadius: 12, overflow: "hidden", border: "1px solid " + C.border, background: "linear-gradient(135deg," + C.blueBg + " 0%," + C.surface + " 100%)", display: "flex", alignItems: "center", padding: coverUrl ? 0 : "0 14px", color: C.blue, fontSize: 30, fontWeight: 800, marginBottom: 8 }}>
        {coverUrl ? <img src={photoThumb(coverUrl, 520)} onError={thumbFallback} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initial}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Cover photo — across the top of the group’s page and its card in Discover.</div>
      {chooser("cover", !!coverUrl, "cover photo")}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.textSub, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, fontWeight: 800 }}>
        {avatarUrl ? <img src={photoThumb(avatarUrl, 64)} onError={thumbFallback} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initial}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Avatar — beside the group’s name everywhere it is listed.</div>
        {chooser("avatar", !!avatarUrl, "avatar")}
      </div>
    </div>
  </div>;
}

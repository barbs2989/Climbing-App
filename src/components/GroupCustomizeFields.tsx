import { C } from "../../ClimbMatchCore.jsx";
import { GROUP_ACCENTS, GROUP_LINK_MAX } from "../../lib/groupRules.js";
import ActionIcon from "./ActionIcon.tsx";
import { POP_REMOVE } from "../../lib/popupChrome.js";

/** One link a group shows on its About tab (0506). */
export interface GroupLinkDraft { label: string; url: string }

/** The part of the group form's draft this section edits. */
export interface GroupCustomizeDraft {
  accent?: string;
  announcement?: string;
  welcomeText?: string;
  links?: GroupLinkDraft[];
  modTitle?: string;
}

interface GroupCustomizeFieldsProps {
  draft: GroupCustomizeDraft;
  /** Hands a change back to the form's draft; it is saved with the form. */
  onChange: (patch: GroupCustomizeDraft) => void;
}

/* WHAT A GROUP'S ORGANIZERS CUSTOMIZE (owner 2026-11-23, "do all", 0506), beside its avatar and cover:
   a colour, a banner at the top of its page, a welcome note its members see, up to four links, and
   what the roster calls a moderator. Each limit here is the database's own (0506), so a save is not refused
   for a length the form allowed; the links are checked by cleanGroupLinks when the form is saved. */
export default function GroupCustomizeFields({ draft, onChange }: GroupCustomizeFieldsProps) {
  const accent = draft.accent || "";
  const links = draft.links || [];
  const box = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, outline: "none" };
  const sub = (t: string, hint?: string) => <div style={{ margin: "12px 0 6px" }}><div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSub }}>{t}</div>{hint ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div> : null}</div>;
  const count = (v: string, max: number) => <div style={{ fontSize: 11, color: v.length > max * 0.9 ? C.amber : C.textMuted, textAlign: "right", marginTop: 3 }}>{v.length + " / " + max}</div>;
  const setLink = (ix: number, patch: Partial<GroupLinkDraft>) => onChange({ links: links.map((l, i) => i === ix ? { ...l, ...patch } : l) });
  return <div>
    {sub("Colour", "Tints the group's band and initial when it has no photos.")}
    <div role="radiogroup" aria-label="Group colour" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" role="radio" aria-checked={!accent} aria-label="Colour: picked from the name" onClick={() => onChange({ accent: "" })} style={{ minWidth: 44, minHeight: 44, padding: "0 10px", borderRadius: 22, border: "2px solid " + (!accent ? C.text : C.border), background: C.surface, color: C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Auto</button>
      {GROUP_ACCENTS.map(([hex, name]) => { const on = accent.toLowerCase() === String(hex).toLowerCase(); return <button key={hex} type="button" role="radio" aria-checked={on} aria-label={"Colour: " + name} onClick={() => onChange({ accent: hex })} style={{ width: 44, height: 44, borderRadius: 22, border: "2px solid " + (on ? C.text : "transparent"), background: C.surface, padding: 4, cursor: "pointer" }}><span aria-hidden="true" style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: hex }} /></button>; })}
    </div>
    {sub("Announcement", "A banner at the top of the group's page, for anyone who opens it. Leave it empty for none.")}
    <textarea aria-label="Announcement" value={draft.announcement || ""} maxLength={300} rows={2} onChange={(e) => onChange({ announcement: e.target.value })} placeholder="e.g. Gym night moves to Thursday this week." style={{ ...box, resize: "vertical", fontFamily: "inherit" }} />
    {count(draft.announcement || "", 300)}
    {sub("Welcome message", "Members see it at the top of Discussion once they're in.")}
    <textarea aria-label="Welcome message" value={draft.welcomeText || ""} maxLength={600} rows={3} onChange={(e) => onChange({ welcomeText: e.target.value })} placeholder="Say hi, read the rules, and post where you want to climb." style={{ ...box, resize: "vertical", fontFamily: "inherit" }} />
    {count(draft.welcomeText || "", 600)}
    {sub("Links", "Up to " + GROUP_LINK_MAX + ", shown on About: a website, Instagram, a sign-up form.")}
    {links.map((l, ix) => <div key={ix} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}>
      <input aria-label={"Link " + (ix + 1) + " label"} value={l.label} maxLength={40} onChange={(e) => setLink(ix, { label: e.target.value })} placeholder="Label" style={{ ...box, flex: "0 0 34%" }} />
      <input aria-label={"Link " + (ix + 1) + " address"} value={l.url} maxLength={300} inputMode="url" autoCapitalize="none" onChange={(e) => setLink(ix, { url: e.target.value })} placeholder="https://" style={{ ...box, flex: 1, minWidth: 0 }} />
      <button type="button" aria-label={"Remove link " + (ix + 1)} onClick={() => onChange({ links: links.filter((_, i) => i !== ix) })} style={POP_REMOVE}>{"✕"}</button>
    </div>)}
    {links.length < GROUP_LINK_MAX ? <button type="button" onClick={() => onChange({ links: links.concat([{ label: "", url: "" }]) })} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px dashed " + C.border, background: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><ActionIcon name="link" size={14} color={C.blue} />Add a link</button> : null}
    {sub("What to call moderators", "Shown on Members in place of Moderator, e.g. Crew lead or Route setter.")}
    <input aria-label="What to call moderators" value={draft.modTitle || ""} maxLength={24} onChange={(e) => onChange({ modTitle: e.target.value })} placeholder="Moderator" style={box} />
  </div>;
}

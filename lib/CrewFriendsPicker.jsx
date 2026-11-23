// INVITE YOUR FRIENDS, SEVERAL AT ONCE (owner 2026-11-14: "when you click on invite a partner, there
// should be a feature to invite a friend that you have"). The Crew sheet used to list your accepted
// connections as "partners" with one "Invite to crew" button each; every tap closed the sheet and opened
// a one-person note dialog, so inviting three friends meant three round trips. This is a checklist of
// every friend not already on the crew, one optional shared note, and one "Invite N friends" button. It
// stays inside the sheet: the invited rows appear in the roster above as they are sent.
//
// A "friend" is an accepted row in `connections` (migration 0087) -- the same list the Partners tab and
// the friends sheet show. Anyone else is still found with the search below this picker.
import { useState } from "react";
import { C, pubFirst, pubName, profileDiscGrades, profileGradeRows } from "../ClimbMatchCore.jsx";
import { crewGradeFit, crewFitLabel, FIT_RANK } from "./crewFit.js";
import { BTN_SECONDARY, BTN_LINK, TEXT_TAP_INLINE } from "./buttonStyles.js";
import Av from "../src/components/Av.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";

// `room`: how many more the crew's size limit allows (null = no limit). Ticks stop there, and Select all picks only
// that many -- the database refuses an invite past the limit (0415), so ticking more only promised invites that fail.
export default function CrewFriendsPicker({ friends, allAlreadyIn, disc, placeName, placeSub, grade, place = null, onInvite, room = null }) {
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  /* BEST FIT FIRST (lib/crewFit.js, owner 2026-11-23): friends who climb the crew’s discipline lead, then by how their grade sits against the climb; the order within a band is the order given. Nobody is hidden -- a friend is yours to invite. */
  const fitOf = f => place ? crewGradeFit(profileGradeRows(f), place) : null;
  const rankOf = f => (disc && f.disciplines && f.disciplines.indexOf(disc) >= 0 ? 0 : 10) + (function () { const x = fitOf(f); return x ? FIT_RANK[x.fit] : FIT_RANK.unknown; })();
  const list = (friends || []).map((f, i) => [f, i]).sort((a, b) => (rankOf(a[0]) - rankOf(b[0])) || (a[1] - b[1])).map(x => x[0]);
  if (!list.length) {
    return <div style={{ background: C.card, border: "1px dashed " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{allAlreadyIn ? "All your friends are on this crew" : "No friends to invite yet"}</div>
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}>{allAlreadyIn ? "Search below to invite anyone else on ClimbMatch." : "Friends you add from Partners show here, ready to invite in one tap. Search below for anyone on ClimbMatch."}</div>
    </div>;
  }
  const isOn = id => picked.indexOf(id) >= 0;
  const capped = room != null;
  const atLimit = capped && picked.length >= room;
  const toggle = id => setPicked(p => isOn(id) ? p.filter(x => x !== id) : (capped && p.length >= room ? p : p.concat([id])));
  const allOn = picked.length > 0 && picked.length === (capped ? Math.min(room, list.length) : list.length);
  const chosen = list.filter(f => isOn(f.id));
  const where = placeName + (placeSub ? " on " + placeSub : "");
  const suggested = "Want to join my crew for " + where + "? " + (grade ? "It’s " + grade + ". " : "") + "Let me know!";
  const send = () => {
    if (!chosen.length) return;
    onInvite(chosen, note.trim());
    setPicked([]); setNote(""); setShowNote(false);
  };
  return <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{"Your friends · " + list.length}</div>
      {list.length > 1 && (!capped || room > 1) ? <button type="button" onClick={() => setPicked(allOn ? [] : list.slice(0, capped ? room : list.length).map(f => f.id))} style={{ ...BTN_LINK(C), ...TEXT_TAP_INLINE, fontSize: 12.5 }}>{allOn ? "Clear" : "Select all"}</button> : null}
    </div>
    {capped ? <div style={{ fontSize: 12, fontWeight: 700, color: room > 0 && !atLimit ? C.textMuted : C.amber, marginBottom: 6 }}>{room <= 0 ? "The crew is full — raise its size above to invite anyone." : atLimit ? "That fills the crew — raise its size above to add more." : "Room for " + room + " more"}</div> : null}
    <div role="group" aria-label="Your friends">
      {list.map(f => {
        const on = isOn(f.id);
        const fits = !!(disc && f.disciplines && f.disciplines.indexOf(disc) >= 0);
        const g = disc ? (profileDiscGrades(f).find(x => x[0] === disc) || [])[1] : null;
        const fit = fitOf(f);
        const fitTxt = fit && fit.fit !== "unknown" ? crewFitLabel(fit, place) : "";
        return <button key={f.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(f.id)} aria-disabled={!on && atLimit ? true : undefined} style={{ opacity: !on && (atLimit || (capped && room <= 0)) ? 0.5 : 1, width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 52, boxSizing: "border-box", padding: "7px 10px", marginBottom: 6, borderRadius: 10, cursor: "pointer", textAlign: "left", background: on ? C.blueBg : C.card, border: "1px solid " + (on ? C.blue : C.border), color: C.text }}>
          <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, border: "2px solid " + (on ? C.blue : C.textMuted), background: on ? C.blue : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{on ? <ActionIcon name="check" size={13} color={C.onSolid} /> : null}</span>
          <Av src={f.avatar} size={32} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{pubName(f)}</span>
            {(fits || fitTxt || (g && g !== "N/A")) ? <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
              {g && g !== "N/A" ? <span style={{ fontSize: 11.5, color: C.textSub }}>{disc.charAt(0).toUpperCase() + disc.slice(1) + " " + g}</span> : null}
              {fits ? <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green }}>{"✓ climbs " + disc}</span> : null}
              {fitTxt ? <span data-crew-fit={fit.fit} style={{ fontSize: 11.5, fontWeight: 700, color: fit.fit === "below" ? C.amber : C.textSub }}>{fitTxt}</span> : null}
            </span> : null}
          </span>
        </button>;
      })}
    </div>
    {chosen.length ? <div style={{ marginTop: 4 }}>
      {showNote ? <div style={{ marginBottom: 8 }}>
        <textarea aria-label="Note to the friends you invite" value={note} onChange={e => setNote(e.target.value.slice(0, 300))} rows={3} placeholder="Add a note (optional)" style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
          <button type="button" onClick={() => setNote(suggested)} style={{ ...BTN_LINK(C), ...TEXT_TAP_INLINE, fontSize: 12.5 }}>Use suggested note</button>
          <span style={{ fontSize: 11.5, color: C.textMuted }}>{note.length + "/300"}</span>
        </div>
      </div> : <button type="button" onClick={() => setShowNote(true)} style={{ ...BTN_LINK(C), ...TEXT_TAP_INLINE, fontSize: 12.5, display: "block", marginBottom: 8 }}>+ Add a note</button>}
      <button type="button" onClick={send} style={{ ...BTN_SECONDARY(C), width: "100%", minHeight: 46, fontWeight: 800, background: C.blueSolid, border: "1px solid " + C.blueSolid, color: C.onSolid }}>{chosen.length === 1 ? "Invite " + pubFirst(chosen[0]) : "Invite " + chosen.length + " friends"}</button>
    </div> : null}
  </div>;
}

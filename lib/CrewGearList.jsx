// The crew's own gear list: the crew types what the trip needs, and each member marks the items
// they are bringing. Nothing is derived from the route -- the route page already shows the gear
// a climb takes. Stored on the crew as `gearExtras` (the typed items) and `gearClaims`
// ({item: [climber ids]}); for a signed-in crew both are per-member columns written through
// set_my_crew_gear (0209), so a member can only claim for themselves and only remove an item
// they added (`_myGearExtras`).
import { useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { POP_REMOVE } from "./popupChrome.js";

export default function CrewGearList({ crew, roster, onUpdateCrew }) {
  const [newItem, setNewItem] = useState("");
  const items = crew.gearExtras || [];
  const claims = crew.gearClaims || {};
  const mineToRemove = crew._myGearExtras;
  const update = patch => onUpdateCrew && onUpdateCrew(crew.id, patch);
  const nameOf = id => {
    if (id === 0) return "You";
    const m = (roster || []).find(p => p.id === id);
    return m ? String(m.name || "").split(" ")[0] : null;
  };
  const whoHas = g => (claims[g] || []).map(nameOf).filter(Boolean);
  const mine = g => (claims[g] || []).indexOf(0) >= 0;
  const add = () => {
    const v = newItem.trim();
    if (!v) return;
    if (!items.some(x => x.toLowerCase() === v.toLowerCase())) update({ gearExtras: items.concat([v]) });
    setNewItem("");
  };
  const toggle = g => {
    const gc = Object.assign({}, claims);
    const arr = (gc[g] || []).slice();
    const ix = arr.indexOf(0);
    if (ix >= 0) arr.splice(ix, 1); else arr.push(0);
    gc[g] = arr;
    update({ gearClaims: gc });
  };
  const canRemove = g => !mineToRemove || mineToRemove.indexOf(g) >= 0;
  const remove = g => {
    const gc = Object.assign({}, claims);
    delete gc[g];
    update({ gearExtras: items.filter(x => x !== g), gearClaims: gc });
  };
  const unclaimed = items.filter(g => !(claims[g] || []).length).length;
  return <div style={{ border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 12 }}>
    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Crew gear · who's bringing what</div>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 10 }}>Add what the crew needs, then tap "I'll bring it" on yours. The route page lists the gear the climb takes.</div>
    {items.map(g => {
      const who = whoHas(g);
      const my = mine(g);
      return <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid " + C.borderLight }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.text, overflowWrap: "anywhere" }}>{g}</div>
          <div style={{ fontSize: 11.5, color: who.length ? C.green : C.textMuted, fontWeight: who.length ? 700 : 400 }}>{who.length ? "Bringing: " + who.join(", ") : "Nobody yet"}</div>
        </div>
        <button onClick={() => toggle(g)} aria-pressed={my} title={my ? "You're bringing this — tap to un-claim" : "Tap if you're bringing this"} style={{ flexShrink: 0, padding: "8px 11px", borderRadius: 9, border: "1px solid " + (my ? C.green : C.border), background: my ? C.greenBg : C.surface, color: my ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{my ? "✓ I'm bringing it" : "I'll bring it"}</button>
        {canRemove(g) ? <button onClick={() => remove(g)} aria-label={"Remove " + g} title={"Remove " + g} style={POP_REMOVE}>✕</button> : null}
      </div>;
    })}
    {items.length && unclaimed ? <div style={{ fontSize: 11.5, fontWeight: 700, color: C.amber, margin: "8px 0 2px" }}>{unclaimed + (unclaimed === 1 ? " item has" : " items have") + " nobody bringing it yet."}</div> : null}
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      <input aria-label="Add a gear item for this crew" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add an item…" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 12.5, outline: "none" }} />
      <button onClick={add} disabled={!newItem.trim()} style={{ padding: "8px 13px", borderRadius: 8, border: "1px solid " + (newItem.trim() ? C.blueDim : C.border), background: newItem.trim() ? C.blueBg : C.surface, color: newItem.trim() ? C.blue : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: newItem.trim() ? "pointer" : "default" }}>Add</button>
    </div>
  </div>;
}

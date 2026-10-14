// The crew's own gear list: the crew types what the trip needs, and each item is marked with who is
// bringing it -- yourself with one tap, or any other confirmed crewmate through "Assign". Nothing is
// derived from the route; the route page already shows the gear a climb takes. Stored on the crew
// as `gearExtras` (the typed items) and `gearClaims` ({item: [climber ids]}). For a signed-in crew
// both are per-member columns: every claim, yours or a crewmate's, is written one item at a time
// through assign_crew_gear (0286/0287), the items you added through set_my_crew_gear_extras (0287),
// and you can only remove an item you added (`_myGearExtras`).
import { useEffect, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { POP_REMOVE } from "./popupChrome.js";

const MAX_ITEM = 80; // assign_crew_gear / set_my_crew_gear_extras refuse anything longer

export default function CrewGearList({ crew, roster, onUpdateCrew }) {
  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [undo, setUndo] = useState(null);
  const items = crew.gearExtras || [];
  const claims = crew.gearClaims || {};
  const mineToRemove = crew._myGearExtras;
  const others = (roster || []).filter(p => !p._me && (!p._status || p._status === "confirmed"));
  useEffect(() => {
    if (!undo) return undefined;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  const update = patch => onUpdateCrew && onUpdateCrew(crew.id, patch);
  const nameOf = id => {
    if (id === 0) return "You";
    const m = (roster || []).find(p => p.id === id);
    return m ? String(m.name || "").split(" ")[0] || "A crewmate" : "A crewmate";
  };
  const has = (g, id) => (claims[g] || []).indexOf(id) >= 0;
  const who = g => (claims[g] || []).map(nameOf);
  const add = () => {
    const v = newItem.trim();
    if (!v) return;
    if (items.some(x => x.toLowerCase() === v.toLowerCase())) { setNote("“" + v + "” is already on the list."); return; }
    setNote("");
    update({ gearExtras: items.concat([v]) });
    setNewItem("");
  };
  const toggle = (g, id) => {
    const gc = Object.assign({}, claims);
    const arr = (gc[g] || []).slice();
    const ix = arr.indexOf(id);
    if (ix >= 0) arr.splice(ix, 1); else arr.push(id);
    gc[g] = arr;
    update({ gearClaims: gc });
  };
  const canRemove = g => !mineToRemove || mineToRemove.indexOf(g) >= 0;
  const remove = g => {
    const gc = Object.assign({}, claims);
    delete gc[g];
    setUndo({ item: g, ids: claims[g] || [] });
    update({ gearExtras: items.filter(x => x !== g), gearClaims: gc });
  };
  const restore = () => {
    if (!undo) return;
    const gc = Object.assign({}, claims);
    gc[undo.item] = undo.ids;
    update({ gearExtras: items.concat([undo.item]), gearClaims: gc });
    setUndo(null);
  };
  const unclaimed = items.filter(g => !(claims[g] || []).length).length;
  const covered = items.length - unclaimed;
  return <div style={{ border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Crew gear · who's bringing what</div>
      {items.length ? <div style={{ fontSize: 11.5, fontWeight: 700, color: unclaimed ? C.amber : C.green, flexShrink: 0 }}>{covered + " of " + items.length + " covered"}</div> : null}
    </div>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 10 }}>Add what the crew needs, then mark who's bringing it. The route page lists the gear the climb takes.</div>
    {items.length ? null : <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, padding: "4px 0 6px" }}>Nothing on the list yet. Add the shared things: rope, draws, a stove, a first-aid kit.</div>}
    {items.map(g => {
      const names = who(g);
      const my = has(g, 0);
      const open = assigning === g;
      return <div key={g} style={{ padding: "6px 0", borderTop: "1px solid " + C.borderLight }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.text, overflowWrap: "anywhere" }}>{g}</div>
            <div style={{ fontSize: 11.5, color: names.length ? C.green : C.amber, fontWeight: 700 }}>{names.length ? "Bringing: " + names.join(", ") : "Nobody yet"}{canRemove(g) ? null : <span style={{ color: C.textMuted, fontWeight: 400 }}>{" · added by a crewmate"}</span>}</div>
          </div>
          <button onClick={() => toggle(g, 0)} aria-pressed={my} aria-label={"I'm bringing " + g} style={{ flexShrink: 0, minHeight: 44, padding: "8px 11px", borderRadius: 9, border: "1px solid " + (my ? C.green : C.border), background: my ? C.greenBg : C.surface, color: my ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{my ? <span aria-hidden="true">{"✓ "}</span> : null}{"I'll bring it"}</button>
          {canRemove(g) ? <button onClick={() => remove(g)} aria-label={"Remove " + g} title={"Remove " + g} style={POP_REMOVE}>✕</button> : null}
        </div>
        {others.length ? <div style={{ marginTop: 2 }}>
          <button onClick={() => setAssigning(open ? null : g)} aria-expanded={open} aria-label={"Assign " + g + " to a crewmate"} style={{ minHeight: 32, padding: "4px 0", background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{open ? "Done assigning" : "Assign to a crewmate"}</button>
          {open ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "2px 0 4px" }}>{others.map(p => {
            const on = has(g, p.id);
            return <button key={String(p.id)} onClick={() => toggle(g, p.id)} aria-pressed={on} style={{ minHeight: 36, padding: "6px 11px", borderRadius: 18, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : C.surface, color: on ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{on ? <span aria-hidden="true">{"✓ "}</span> : null}{nameOf(p.id)}</button>;
          })}</div> : null}
        </div> : null}
      </div>;
    })}
    {items.length && !unclaimed ? <div style={{ fontSize: 11.5, fontWeight: 700, color: C.green, margin: "8px 0 2px" }}>Everything on the list has someone bringing it.</div> : null}
    {unclaimed ? <div style={{ fontSize: 11.5, fontWeight: 700, color: C.amber, margin: "8px 0 2px" }}>{unclaimed + (unclaimed === 1 ? " item has" : " items have") + " nobody bringing it yet."}</div> : null}
    {undo ? <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: C.textSub, margin: "8px 0 2px" }}><span style={{ overflowWrap: "anywhere" }}>{"Removed “" + undo.item + "”."}</span><button onClick={restore} style={{ minHeight: 36, padding: "4px 10px", background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Undo</button></div> : null}
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      <input aria-label="Add a gear item for this crew" value={newItem} maxLength={MAX_ITEM} enterKeyHint="done" onChange={e => { setNewItem(e.target.value); if (note) setNote(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add an item…" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, outline: "none" }} />
      <button onClick={add} disabled={!newItem.trim()} style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid " + (newItem.trim() ? C.blueDim : C.border), background: newItem.trim() ? C.blueBg : C.surface, color: newItem.trim() ? C.blue : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: newItem.trim() ? "pointer" : "default" }}>Add</button>
    </div>
    {note ? <div role="status" style={{ fontSize: 11.5, color: C.amber, marginTop: 5 }}>{note}</div> : null}
  </div>;
}

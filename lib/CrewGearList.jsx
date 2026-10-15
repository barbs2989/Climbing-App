// The crew's own gear list: the crew types what the trip needs, and each item is marked with who is
// bringing it -- yourself with one tap, or any other confirmed crewmate through "Assign". Nothing is
// derived from the route; the route page already shows the gear a climb takes. Stored on the crew
// as `gearExtras` (the typed items) and `gearClaims` ({item: [climber ids]}). For a signed-in crew
// both are per-member columns, and every write is ONE item (0289): add_crew_gear_item,
// remove_crew_gear_item (off the list for the whole crew), and assign_crew_gear for any member's
// claim -- since 0291 only for a confirmed crewmate or yourself, and only on an item that is on the
// list. You can only remove an item you added (`_myGearExtras`), in any capitals. ClimbMatch runs a
// crew's writes in order, one patch at a time, so an item reaches the list before anyone claims it.
// The list stays live: a crewmate's write pings this crew's channel and the card refetches
// (useCrewGearSync).
import { useEffect, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { useCrewGearSync } from "./db";
import { POP_REMOVE } from "./popupChrome.js";

const MAX_ITEM = 80; // the crew-gear functions refuse anything longer

export default function CrewGearList({ crew, roster, onUpdateCrew }) {
  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [undo, setUndo] = useState(null);
  const items = crew.gearExtras || [];
  const claims = crew.gearClaims || {};
  const mineToRemove = crew._myGearExtras;
  const others = (roster || []).filter(p => !p._me && (!p._status || p._status === "confirmed"));
  useCrewGearSync(crew._dbId);
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
  const canRemove = g => !mineToRemove || mineToRemove.some(x => String(x).toLowerCase() === g.toLowerCase());
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
      /* One row: the item and who is bringing it, then the row's controls side by side -- "I'll bring it",
         Assign (only when there is a confirmed crewmate to assign it to) and remove. "Nobody yet" is said
         HERE and nowhere else; the header's "N of M covered" is the count, so no footer repeats it. */
      return <div key={g} style={{ padding: "6px 0", borderTop: "1px solid " + C.borderLight }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.text, overflowWrap: "anywhere" }}>{g}</div>
            <div style={{ fontSize: 11.5, color: names.length ? C.green : C.textMuted, fontWeight: names.length ? 700 : 400 }}>{names.length ? "Bringing: " + names.join(", ") : "Nobody yet"}{canRemove(g) ? null : <span style={{ color: C.textMuted, fontWeight: 400 }}>{" · added by a crewmate"}</span>}</div>
          </div>
          <button onClick={() => toggle(g, 0)} aria-pressed={my} aria-label={"I'll bring it: " + g} style={{ flexShrink: 0, minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + (my ? C.green : C.border), background: my ? C.greenBg : C.surface, color: my ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{my ? <span aria-hidden="true">{"✓ "}</span> : null}{"I'll bring it"}</button>
          {others.length ? <button onClick={() => setAssigning(open ? null : g)} aria-expanded={open} aria-label={open ? "Done assigning " + g : "Assign " + g + " to a crewmate"} style={{ flexShrink: 0, minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + (open ? C.blueDim : C.border), background: open ? C.blueBg : C.surface, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{open ? "Done" : "Assign"}</button> : null}
          {canRemove(g) ? <button onClick={() => remove(g)} aria-label={"Remove " + g} title={"Remove " + g} style={POP_REMOVE}>✕</button> : null}
        </div>
        {open ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 0 2px" }}>{others.map(p => {
          const on = has(g, p.id);
          return <button key={String(p.id)} onClick={() => toggle(g, p.id)} aria-pressed={on} style={{ minHeight: 44, padding: "6px 13px", borderRadius: 22, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : C.surface, color: on ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{on ? <span aria-hidden="true">{"✓ "}</span> : null}{nameOf(p.id)}</button>;
        })}</div> : null}
      </div>;
    })}
    {undo ? <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: C.textSub, margin: "8px 0 2px" }}><span style={{ overflowWrap: "anywhere" }}>{"Removed “" + undo.item + "”."}</span><button onClick={restore} style={{ minHeight: 44, padding: "4px 12px", background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Undo</button></div> : null}
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      <input aria-label="Add a gear item for this crew" value={newItem} maxLength={MAX_ITEM} enterKeyHint="done" onChange={e => { setNewItem(e.target.value); if (note) setNote(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add an item…" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, outline: "none" }} />
      <button onClick={add} disabled={!newItem.trim()} style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid " + (newItem.trim() ? C.blueDim : C.border), background: newItem.trim() ? C.blueBg : C.surface, color: newItem.trim() ? C.blue : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: newItem.trim() ? "pointer" : "default" }}>Add</button>
    </div>
    {note ? <div role="status" style={{ fontSize: 11.5, color: C.amber, marginTop: 5 }}>{note}</div> : null}
  </div>;
}

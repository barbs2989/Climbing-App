// The crew's own gear list: the crew types what the trip needs, and each item is marked with who is
// bringing it, and how many -- yourself with one tap, or any other confirmed crewmate through "Edit".
// Nothing is derived from the route and nothing is suggested: the list holds only what the crew typed.
// Stored on the crew as `gearExtras` (the typed items), `gearClaims` ({item: [climber ids]}),
// `gearCounts` ({item: {climber id: n}}, only counts above one) and `gearWanted` ({item: n}, how many
// the crew wants; absent means no number). Several climbers can bring the same item, and the counts
// add up: "Quickdraws · 12 wanted" is covered once the bringers' counts reach 12. For a signed-in crew
// every write is ONE item (0289, 0328): add_crew_gear_item, remove_crew_gear_item (off the list for
// the whole crew, quantities included), assign_crew_gear for any member's claim -- since 0291 only for
// a confirmed crewmate or yourself, and only on an item that is on the list -- set_crew_gear_count and
// set_crew_gear_wanted. You can only remove an item you added (`_myGearExtras`), in any capitals.
// ClimbMatch runs a crew's writes in order, one patch at a time, so an item reaches the list before
// anyone claims it, and a claim before its count. The list stays live: a crewmate's write pings this
// crew's channel and the card refetches (useCrewGearSync).
import { useEffect, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { useCrewGearSync } from "./db";
import { POP_REMOVE } from "./popupChrome.js";

const MAX_ITEM = 80; // the crew-gear functions refuse anything longer
const MAX_QTY = 999; // ...and any quantity above this (0328)

const stepBtn = { minWidth: 44, minHeight: 44, padding: 0, borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 18, fontWeight: 700, cursor: "pointer", flexShrink: 0 };
// − n +, for a count of things. `value` null shows "—" (no number), which is where the crew's
// "wanted" stepper starts; a climber's own count never goes below one (untick to stop bringing it).
function Stepper({ label, value, min, onChange }) {
  const lo = value == null || value <= min;
  const hi = value != null && value >= MAX_QTY;
  return <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <button onClick={() => { if (!lo) onChange(value - 1 < 1 ? null : value - 1); }} disabled={lo} aria-label={"Fewer: " + label} style={{ ...stepBtn, color: lo ? C.textMuted : C.text, cursor: lo ? "default" : "pointer" }}>−</button>
    <div role="status" aria-label={label + ": " + (value == null ? "no number" : value)} style={{ minWidth: 30, textAlign: "center", fontSize: 14, fontWeight: 800, color: C.text }}>{value == null ? "—" : value}</div>
    <button onClick={() => { if (!hi) onChange((value || 0) + 1); }} disabled={hi} aria-label={"More: " + label} style={{ ...stepBtn, color: hi ? C.textMuted : C.text, cursor: hi ? "default" : "pointer" }}>+</button>
  </div>;
}

export default function CrewGearList({ crew, roster, onUpdateCrew }) {
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(null);
  const [undo, setUndo] = useState(null);
  const items = crew.gearExtras || [];
  const claims = crew.gearClaims || {};
  const counts = crew.gearCounts || {};
  const wanted = crew.gearWanted || {};
  const mineToRemove = crew._myGearExtras;
  // A climber who has only asked to join can put themselves down, but cannot set the crew's numbers
  // or put anyone else down (0291, 0328).
  const confirmedMe = !crew._myStatus || crew._myStatus === "confirmed";
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
  const countOf = (g, id) => ((counts[g] || {})[id]) || 1;
  const total = g => (claims[g] || []).reduce((n, id) => n + countOf(g, id), 0);
  const isCovered = g => (claims[g] || []).length > 0 && total(g) >= (wanted[g] || 1);
  const add = () => {
    const v = newItem.trim();
    if (!v) return;
    if (items.some(x => x.toLowerCase() === v.toLowerCase())) { setNote("“" + v + "” is already on the list."); return; }
    const q = parseInt(newQty, 10);
    setNote("");
    const patch = { gearExtras: items.concat([v]) };
    if (q > 0) patch.gearWanted = Object.assign({}, wanted, { [v]: Math.min(MAX_QTY, q) });
    update(patch);
    setNewItem("");
    setNewQty("");
  };
  const toggle = (g, id) => {
    const gc = Object.assign({}, claims);
    const arr = (gc[g] || []).slice();
    const ix = arr.indexOf(id);
    const patch = {};
    if (ix >= 0) {
      arr.splice(ix, 1);
      // Unticking clears the count too, so ticking again starts at one rather than an old number.
      if ((counts[g] || {})[id] != null) {
        const per = Object.assign({}, counts[g]);
        delete per[id];
        patch.gearCounts = Object.assign({}, counts, { [g]: per });
      }
    } else arr.push(id);
    gc[g] = arr;
    patch.gearClaims = gc;
    update(patch);
  };
  const setCount = (g, id, n) => {
    const per = Object.assign({}, counts[g] || {});
    if (n > 1) per[id] = n; else delete per[id];
    update({ gearCounts: Object.assign({}, counts, { [g]: per }) });
  };
  const setWanted = (g, n) => {
    const gw = Object.assign({}, wanted);
    if (n > 0) gw[g] = n; else delete gw[g];
    update({ gearWanted: gw });
  };
  const canRemove = g => !mineToRemove || mineToRemove.some(x => String(x).toLowerCase() === g.toLowerCase());
  const remove = g => {
    const gc = Object.assign({}, claims), gn = Object.assign({}, counts), gw = Object.assign({}, wanted);
    delete gc[g]; delete gn[g]; delete gw[g];
    setUndo({ item: g, ids: claims[g] || [], counts: counts[g] || null, wanted: wanted[g] || null });
    if (editing === g) setEditing(null);
    update({ gearExtras: items.filter(x => x !== g), gearClaims: gc, gearCounts: gn, gearWanted: gw });
  };
  const restore = () => {
    if (!undo) return;
    const patch = { gearExtras: items.concat([undo.item]), gearClaims: Object.assign({}, claims, { [undo.item]: undo.ids }) };
    if (undo.counts) patch.gearCounts = Object.assign({}, counts, { [undo.item]: undo.counts });
    if (undo.wanted) patch.gearWanted = Object.assign({}, wanted, { [undo.item]: undo.wanted });
    update(patch);
    setUndo(null);
  };
  const covered = items.filter(isCovered).length;
  const short = items.length - covered;
  // Who can be put down for an item from this card: you, then each confirmed crewmate.
  const people = confirmedMe ? [0].concat(others.map(p => p.id)) : [0];
  return <div style={{ border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Crew gear · who's bringing what</div>
      {items.length ? <div style={{ fontSize: 11.5, fontWeight: 700, color: short ? C.amber : C.green, flexShrink: 0 }}>{covered + " of " + items.length + " covered"}</div> : null}
    </div>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 10 }}>Add what your crew is bringing, with how many if it matters, then mark who's bringing it. More than one of you can bring the same thing.</div>
    {items.length ? null : <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, padding: "4px 0 6px" }}>Nothing on the list yet.</div>}
    {items.map(g => {
      const ids = claims[g] || [];
      const my = has(g, 0);
      const open = editing === g;
      const want = wanted[g] || null;
      const ok = isCovered(g);
      const bringing = ids.map(id => nameOf(id) + (want || countOf(g, id) > 1 ? " ×" + countOf(g, id) : "")).join(", ");
      /* One row: the item and how many the crew wants, who is bringing how many; then "I'll bring it",
         Edit (who brings it, and how many) and remove. "Nobody yet" is said HERE and nowhere else; the
         header's "N of M covered" is the count, so no footer repeats it. */
      return <div key={g} style={{ padding: "6px 0", borderTop: "1px solid " + C.borderLight }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.text, overflowWrap: "anywhere" }}>{g}{want ? <span style={{ color: C.textSub, fontWeight: 700 }}>{" · " + want + " wanted"}</span> : null}</div>
            <div style={{ fontSize: 11.5, color: ids.length ? (ok ? C.green : C.amber) : C.textMuted, fontWeight: ids.length ? 700 : 400 }}>{ids.length ? "Bringing: " + bringing + (want && !ok ? " · " + total(g) + " of " + want : "") : "Nobody yet"}{canRemove(g) ? null : <span style={{ color: C.textMuted, fontWeight: 400 }}>{" · added by a crewmate"}</span>}</div>
          </div>
          <button onClick={() => toggle(g, 0)} aria-pressed={my} aria-label={"I'll bring it: " + g} style={{ flexShrink: 0, minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + (my ? C.green : C.border), background: my ? C.greenBg : C.surface, color: my ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{my ? <span aria-hidden="true">{"✓ "}</span> : null}{"I'll bring it"}</button>
          <button onClick={() => setEditing(open ? null : g)} aria-expanded={open} aria-label={open ? "Done editing " + g : "Edit who brings " + g + " and how many"} style={{ flexShrink: 0, minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + (open ? C.blueDim : C.border), background: open ? C.blueBg : C.surface, color: open ? "#fff" : C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{open ? "Done" : "Edit"}</button>
          {canRemove(g) ? <button onClick={() => remove(g)} aria-label={"Remove " + g} title={"Remove " + g} style={POP_REMOVE}>✕</button> : null}
        </div>
        {open ? <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0 2px" }}>
          {confirmedMe ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.textSub, fontWeight: 700 }}>How many the crew wants</div>
            <Stepper label={"how many " + g + " the crew wants"} value={want} min={0} onChange={n => setWanted(g, n)} />
          </div> : null}
          {people.map(id => {
            const on = has(g, id);
            const who = nameOf(id);
            return <div key={String(id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <button onClick={() => toggle(g, id)} aria-pressed={on} aria-label={who + (id === 0 ? " bring " : " brings ") + g} style={{ minHeight: 44, padding: "6px 13px", borderRadius: 22, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : C.surface, color: on ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{on ? <span aria-hidden="true">{"✓ "}</span> : null}{who}</button>
              {on ? <Stepper label={"how many " + g + (id === 0 ? " you bring" : " " + who + " brings")} value={countOf(g, id)} min={1} onChange={n => setCount(g, id, n || 1)} /> : null}
            </div>;
          })}
        </div> : null}
      </div>;
    })}
    {undo ? <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: C.textSub, margin: "8px 0 2px" }}><span style={{ overflowWrap: "anywhere" }}>{"Removed “" + undo.item + "”."}</span><button onClick={restore} style={{ minHeight: 44, padding: "4px 12px", background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Undo</button></div> : null}
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      <input aria-label="Add a gear item for this crew" value={newItem} maxLength={MAX_ITEM} enterKeyHint="done" onChange={e => { setNewItem(e.target.value); if (note) setNote(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add an item…" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, outline: "none" }} />
      {confirmedMe ? <input aria-label="How many the crew wants, optional" value={newQty} inputMode="numeric" maxLength={3} enterKeyHint="done" onChange={e => setNewQty(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Qty" style={{ width: 56, flexShrink: 0, boxSizing: "border-box", minHeight: 44, padding: "8px 6px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, textAlign: "center", outline: "none" }} /> : null}
      <button onClick={add} disabled={!newItem.trim()} style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid " + (newItem.trim() ? C.blueDim : C.border), background: newItem.trim() ? C.blueBg : C.surface, color: newItem.trim() ? "#fff" : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: newItem.trim() ? "pointer" : "default" }}>Add</button>
    </div>
    {note ? <div role="status" style={{ fontSize: 11.5, color: C.amber, marginTop: 5 }}>{note}</div> : null}
  </div>;
}

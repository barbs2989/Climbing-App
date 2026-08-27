// The DB-catalog area hierarchy browser — the "All areas" overlay.
//
// WHY THIS EXISTS. `AreaTree` in ClimbMatchCore walks the seed MOUNTAINS array and counts seed
// ROUTES, and it is gated on `selArea`, which ONLY the seed browse path ever writes. deploy.yml
// sets VITE_USE_DB="true", so production renders DbAreaBrowser, which reports its position through
// `onAreaContext` and never calls setSelArea. The overlay was therefore built, correct, and
// unreachable for every real climber — see [[three-climbs-tab-sections-dead-in-production]].
//
// Deliberately mirrors AreaTree's layout, copy and palette so the two feel like one product, the
// same relationship DbAreaBrowser has with AreaBrowse.
//
// THREE THINGS THAT ARE NOT A STRAIGHT PORT, each because the DB answers a different question:
//
//  1. THE COUNT IS `areas.route_count`, not a count of routes. The seed version computes
//     `ROUTES.filter(r => inArea(r.mountainId, id)).length` — a SUBTREE total — and route_count is
//     maintained as exactly that by a trigger on `routes`. So the column is the right answer here,
//     not an approximation of it. (It can drift when an AREA moves; `check:counts` is the guard,
//     and this overlay is a reader, so it shows what the catalog believes.)
//
//  2. EVERY NODE OFFERS AN EXPAND TOGGLE, even leaves. `areas` has no child_count column, so
//     "does this node have children" cannot be known without querying — and querying every visible
//     node to decide whether to draw a chevron would defeat the laziness entirely. An expanded node
//     with no children says so in one muted line. The seed version knew, because it held the whole
//     tree in memory; that is the honest cost of not holding 47,638 areas client-side.
//
//  3. EACH NODE IS ITS OWN COMPONENT so it can call useAreaChildren when it opens. Hooks cannot be
//     called in a loop over a dynamic list, and a single query per expansion is what keeps this
//     cheap on a 47k-area catalog.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAreaChildren, useAreaPath, useAreaSearch } from "./db";
import { clickable } from "./clickable";

// A failed read must not read as an empty branch. This app has shipped that defect repeatedly —
// state stays [], every render tests !x.length, and loaded-and-empty is indistinguishable from
// never-loaded ([[a-failed-read-must-not-read-as-empty]]). Keyed on this query's own isError, so a
// slow read still reads as loading.
function Branch({ node, depth, currentId, onNavigate, openByDefault, C }) {
  const [open, setOpen] = useState(!!openByDefault);
  const kidsQ = useAreaChildren(node.id, { enabled: open });
  const kids = kidsQ.data || [];
  const failed = !!kidsQ.isError;
  const cur = node.id === currentId;
  const n = node.route_count || 0;
  const pad = 14 + depth * 22;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px " + pad + "px", borderBottom: "1px solid " + C.borderLight, background: cur ? C.blueBg : "transparent" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={(open ? "Collapse " : "Expand ") + node.name}
          aria-expanded={open ? "true" : "false"}
          style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 18, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
        >{open ? "▾" : "▸"}</button>
        {/* The name is its own control and the count is a SIBLING of it, never inside — a count
            rendered within the button welds into the announced name ("Index Town Walls1365"),
            which is the #740 defect check:a11y-badges exists for. */}
        <button onClick={() => onNavigate(node)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
          <div style={{ fontSize: 14.5, fontWeight: cur ? 800 : 700, color: cur ? C.blue : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.name}
            {cur ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}
          </div>
        </button>
        {n > 0 ? <span aria-label={n + " climbs"} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{n}</span> : null}
        <span {...clickable(() => onNavigate(node))} aria-label={"Open " + node.name} style={{ flexShrink: 0, color: C.textMuted, fontSize: 16, cursor: "pointer", padding: "0 2px" }}>{"›"}</span>
      </div>
      {open ? (
        failed
          ? <div style={{ padding: "10px 12px 10px " + (pad + 46) + "px", fontSize: 12.5, color: C.textMuted }}>Couldn’t load what is inside {node.name} — this is not an empty area. Check your connection and try again.</div>
          : kidsQ.isPending
            ? <div style={{ padding: "10px 12px 10px " + (pad + 46) + "px", fontSize: 12.5, color: C.textMuted }}>Loading…</div>
            : kids.length
              ? kids.map((k) => <Branch key={k.id} node={k} depth={depth + 1} currentId={currentId} onNavigate={onNavigate} C={C} />)
              : <div style={{ padding: "10px 12px 10px " + (pad + 46) + "px", fontSize: 12.5, color: C.textMuted }}>No sub-areas — climbs here are listed on the area page.</div>
      ) : null}
    </div>
  );
}

export default function DbAreaTree({ area, onNavigate, onClose, C }) {
  const [q, setQ] = useState("");
  // The seed version walks parentId up to the `state` ancestor and roots the tree there, so the
  // overlay shows a whole state rather than the world. useAreaPath returns that chain root-first.
  const pathQ = useAreaPath(area && area.id);
  const chain = pathQ.data || [];
  const stateRoot = chain.find((a) => a.area_type === "state") || chain[0] || null;
  const rootId = stateRoot ? stateRoot.id : null;
  const searchQ = useAreaSearch(rootId, q.trim());
  const searching = !!q.trim();

  // PORTALLED TO <body>, and check:overlay-portals caught this the first time it was not.
  // `#appscroll` establishes a stacking context, so a position:fixed overlay rendered inside it
  // paints UNDER the app header and bottom nav however high its z-index — the trap recorded in
  // [[appscroll-traps-fixed-overlays]]. The seed AreaTree is mounted outside that subtree and so
  // never needed this; its DB twin is mounted from the Climbs tab and does.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 400, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Back" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "12px 16px", fontSize: 17, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{"← Back"}</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>All areas</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pathQ.isError ? "Couldn’t load this area’s place in the catalog" : stateRoot ? stateRoot.name + " — tap a name to jump, ▸ to expand" : "Loading…"}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, width: 38, height: 38, fontSize: 18, cursor: "pointer" }}>{"×"}</button>
      </div>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <input aria-label="Filter areas & crags" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter areas & crags…" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: 30 }}>
        {pathQ.isError || (!rootId && !pathQ.isPending)
          ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Couldn’t load the area tree. Check your connection and try again.</div>
          : searching
            ? (searchQ.isError
              ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Couldn’t search areas — this is not an empty result. Try again.</div>
              : searchQ.isPending
                ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Searching…</div>
                : (searchQ.data || []).length
                  ? (searchQ.data || []).map((m) => (
                    <div key={m.id} {...clickable(() => onNavigate(m))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.area_type || ""}</div>
                      </div>
                      {m.route_count > 0 ? <span aria-label={m.route_count + " climbs"} style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>{m.route_count}</span> : null}
                      <span style={{ color: C.textMuted, fontSize: 16 }}>{"›"}</span>
                    </div>
                  ))
                  : <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>{"No areas match “" + q.trim() + "”"}</div>)
            : stateRoot
              ? <Branch node={stateRoot} depth={0} currentId={area && area.id} onNavigate={onNavigate} openByDefault C={C} />
              : <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading…</div>}
      </div>
    </div>,
    document.body,
  );
}

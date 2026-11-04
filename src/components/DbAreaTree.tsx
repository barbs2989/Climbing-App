import { useAreaChildren, useCountries, useAreaSearch, areaSearchTotal } from "../../lib/db";
import Chevron from "./Chevron.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import { POP_BACK, POP_CLOSE } from "../../lib/popupChrome.js";
import { clickable } from "../../lib/clickable";
import { ATYPE } from "../../lib/areaBrowserShared.js";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface DbAreaTreeArea {
  id: string;
  name: string;
  parent_id: string;
  parent_name?: string | null;
  area_type: keyof typeof ATYPE;
  route_count: number;
}
interface DbAreaTreeNodeProps {
  area: DbAreaTreeArea;
  depth: number;
  currentId: string;
  /** Ids listed first among their siblings (the state and the country above it). */
  pinIds?: string[] | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (a: DbAreaTreeArea) => void;
  C: typeof Palette;
}
interface DbAreaTreeRootsProps {
  currentId: string;
  pinIds?: string[] | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (a: DbAreaTreeArea) => void;
  C: typeof Palette;
}
export interface DbAreaTreeProps {
  /** The state being browsed; its parent (the country) opens expanded too. */
  stateRoot: DbAreaTreeArea;
  current: DbAreaTreeArea;
  /** Ids of every area drilled through, expanded on open. */
  ancestorIds?: string[] | null;
  onNavigate: (a: DbAreaTreeArea) => void;
  onClose: () => void;
  C: typeof Palette;
}

// ── All areas: full-screen expandable tree, DB-catalog equivalent of the static
// AreaTree. Only WA's hierarchy is deep enough to matter here, and even a single
// state can run to thousands of areas, so unlike the static version (which
// preloads and expands the whole subtree from the in-memory MOUNTAINS array)
// this fetches each node's children only once it's actually expanded. ──
// The state you are browsing, and the country above it, are listed FIRST among their
// siblings. The tree opens with the country expanded, and its states are alphabetical,
// so Washington used to sit halfway down a list of fifty — the one row you came from was
// the one you had to scroll to find. Everything else keeps its order.
const pinFirst = (list: DbAreaTreeArea[], pinIds?: string[] | null) => pinIds && pinIds.length ? [...list].sort((a, b) => (pinIds.includes(b.id) ? 1 : 0) - (pinIds.includes(a.id) ? 1 : 0)) : list;
function DbAreaTreeNode({ area, depth, currentId, pinIds, expanded, onToggle, onNavigate, C }: DbAreaTreeNodeProps) {
  const isOpen = expanded.has(area.id);
  // `error` is destructured because without it a FAILED children fetch left `children`
  // undefined and fell through to "No sub-areas." — an affirmative claim that a
  // formation holds nothing, on a node that may hold plenty. main.jsx sets
  // networkMode "always", so an offline device errors immediately rather than pausing,
  // which makes this the common case rather than a rare one.
  const { data: children, isLoading, error } = useAreaChildren(area.id, { enabled: isOpen });
  const cur = area.id === currentId;
  const n = area.route_count;
  // Indent TAPERS. It used to be 22px per level with no ceiling, so the spires under
  // Liberty Bell Group (depth 7: usa > wa > region > hwy 20 > north cascades > pass >
  // group) spent 168px on indent and the name was ellipsised to a few letters on a 390px
  // phone. Every level must still step right — a hard cap put the group and its own
  // spires at one indent, reading as siblings — so past depth 4 each level costs 6px.
  const pad = 12 + Math.min(depth, 4) * 12 + Math.max(depth - 4, 0) * 6;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px " + pad + "px", borderBottom: "1px solid " + C.borderLight, background: cur ? C.blueBg : "transparent" }}>
        <button onClick={() => onToggle(area.id)} aria-label={(isOpen ? "Collapse " : "Expand ") + area.name} aria-expanded={isOpen} style={{ flexShrink: 0, width: 44, height: 44, minHeight: 44, borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color:C.onSolid, fontSize: 18, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Chevron open={isOpen} color={C.blue} /></button>
        {/* One target opens the area: the name, its count and the chevron. The chevron used
            to be a separate 16px span and the name was cut to one line, so the only ways in
            were a sliver of truncated text or an arrow a thumb barely covers. Names wrap. */}
        <button onClick={() => onNavigate(area)} aria-label={"Open " + area.name + (n > 0 ? ", " + n + " climb" + (n !== 1 ? "s" : "") : "")} style={{ flex: 1, minWidth: 0, minHeight: 38, display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.3, fontWeight: cur ? 800 : 700, color: cur ? C.blue : C.text, overflowWrap: "anywhere" }}>{area.name}{cur ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap", display: "inline-block" }}>You are here</span> : null}</div>
          {n > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{n}</span> : null}
          <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
        </button>
      </div>
      {isOpen ? (
        isLoading
          ? <LoadingRows C={C} label="Loading…" style={{padding: "10px 14px 10px " + (pad + 46) + "px"}}/>
          : children && children.length
            ? pinFirst(children, pinIds).map((k: DbAreaTreeArea) => <DbAreaTreeNode key={k.id} area={k} depth={depth + 1} currentId={currentId} pinIds={pinIds} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />)
            : error
              ? <div style={{ padding: "10px 14px 10px " + (pad + 46) + "px", color: C.amber, fontSize: 12 }}>Couldn’t load what’s inside.</div>
              : <div style={{ padding: "10px 14px 10px " + (pad + 46) + "px", color: C.textMuted, fontSize: 12 }}>No sub-areas.</div>
      ) : null}
    </div>
  );
}
// The top of the tree is the top of the CATALOG — the same root the drill-down calls
// "All areas" in its own breadcrumb. This used to render `stateRoot` as depth 0, so a
// screen titled "All areas" began at Washington and silently omitted the two levels
// above it (usa > washington), which is precisely the level the breadcrumb beside it
// labels "All areas". The tree and the drill-down agreed at every level below the state
// and disagreed about where the hierarchy starts.
//
// `useCountries` rather than a fresh useAreaChildren(null): it is the same query the
// country picker on the area screen has already run, so opening the tree costs no
// request. Children below this are still fetched only on expand — the catalog is 47k
// areas and eagerly walking it has never been affordable.
function DbAreaTreeRoots({ currentId, pinIds, expanded, onToggle, onNavigate, C }: DbAreaTreeRootsProps) {
  const { data: roots, isLoading, error } = useCountries();
  const pad = { padding: "14px 16px", color: C.textMuted, fontSize: 12.5 };
  if (isLoading) return <div style={pad}>Loading…</div>;
  if (error) return <div style={{ ...pad, color: C.amber }}>Couldn’t load the area tree.</div>;
  if (!roots || !roots.length) return <div style={pad}>No areas.</div>;
  return pinFirst(roots, pinIds).map((r: DbAreaTreeArea) => <DbAreaTreeNode key={r.id} area={r} depth={0} currentId={currentId} pinIds={pinIds} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />);
}
export default function DbAreaTree({ stateRoot, current, ancestorIds, onNavigate, onClose, C }: DbAreaTreeProps) {
  // Open on the path you are actually standing on: the country above the state, the
  // state, and every area you have drilled through. Without the country the new root
  // level would render collapsed and the tree would open showing two rows.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([stateRoot.parent_id, stateRoot.id, ...(ancestorIds || [])].filter(Boolean)));
  const [q, setQ] = useState("");
  // 60 rather than the 40 the in-page search box uses: this is a full-screen list with
  // nothing else competing for the height, so the same cap that suits an inline dropdown
  // just truncates more often here.
  const { data: results, isLoading: searching, error: searchError } = useAreaSearch(stateRoot.id, q.trim(), 60);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- original ternary statement, kept verbatim
  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = areaSearchTotal(results);

  // Portal to <body> — this component mounts deep inside the tab content tree,
  // and an ancestor there creates its own stacking context, which traps a plain
  // position:fixed child under the app's own sticky top nav despite a higher
  // z-index. Escaping to <body> sidesteps that entirely.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 400, display: "flex", flexDirection: "column" ,maxWidth:520,margin:"0 auto",boxSizing:"border-box"}}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Back" style={POP_BACK}>{"← Back"}</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 800, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>All areas</div>
          {/* The subtitle used to read "<state> — tap a name to jump, ▸ to expand", which
              answers "what can I do here" and never "where am I". This screen is opened
              from an area page and covers it completely, so without naming the area you
              came from there is nothing on screen tying the tree back to it — the "You
              are here" badge is the only marker and it can be many scrolls down a
              collapsed tree. The instructions moved under the filter box, where they sit
              beside the control they describe. */}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflowWrap: "anywhere" }}>
            {current && current.id !== stateRoot.id ? "Viewing " + current.name + " · " + stateRoot.name : stateRoot.name}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <input aria-label="Search areas, crags and peaks" value={q} onChange={e => setQ(e.target.value)} placeholder={"Search " + stateRoot.name + "’s areas, crags and peaks…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
        {/* Say what each of the two tap targets does. They look alike and do opposite
            things: the name OPENS the area (closing this screen), the ▸ only reveals
            what is inside it without going anywhere. */}
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 7, lineHeight: 1.45 }}>
          {q.trim()
            ? (total > 0 ? "Best matches first — tap one to open its climbs." : "Searches every area under " + stateRoot.name + ", at any depth.")
            : "Tap a name to open that area’s climbs · tap the arrow to see what’s inside it"}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: 30 }}>
        {q.trim() ? (
          searching ? <LoadingRows C={C} label="Loading…" style={{padding: "26px 16px"}}/>
          : searchError ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.red, fontSize: 13 }}>Couldn't search areas — check your connection and try again.</div>
          : !results || !results.length ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>{'No areas match "' + q.trim() + '"'}</div>
          : <>
            {results.map((m: DbAreaTreeArea) => (
              <div key={m.id} {...clickable(() => onNavigate(m))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer", background: m.id === current.id ? C.blueBg : "transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: m.id === current.id ? C.blue : C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{m.name}{m.id === current.id ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}</div>
                  {/* The RPC has always returned area_type and this row threw it away, so a
                      hit read as a bare name with no way to tell a summit from a boulder —
                      while the in-page Areas search two screens over renders exactly this
                      line. Same data, same shape, so the two searches now agree. */}
                  <div style={{ fontSize: 11.5, color: C.textMuted, overflowWrap: "anywhere" }}>{[ATYPE[m.area_type] || m.area_type, m.parent_name].filter(Boolean).join(" · ")}</div>
                </div>
                {m.route_count > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{m.route_count + " climb" + (m.route_count !== 1 ? "s" : "")}</span> : null}
                <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
              </div>
            ))}
            {/* Never truncate silently. Before 0147 this list was the alphabetically-first
                40 of however many matched, with nothing on screen admitting it — so a
                search for "mount" in Washington showed A–G of 216 and Mount Rainier read
                as missing from the catalog. */}
            {total > results.length ? (
              <div style={{ padding: "14px 16px", textAlign: "center", color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>
                {"Showing the " + results.length + " closest matches of " + total.toLocaleString() + " — keep typing to narrow it down."}
              </div>
            ) : null}
          </>
        ) : (
          <DbAreaTreeRoots currentId={current.id} pinIds={[stateRoot.parent_id, stateRoot.id].filter(Boolean)} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} C={C} />
        )}
      </div>
    </div>,
    document.body
  );
}

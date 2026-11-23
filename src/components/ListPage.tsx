import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { POP_BACK, POP_REMOVE } from "../../lib/popupChrome.js";

type ListPageOption = readonly [string, string];
interface ListPagePick { value: string; onChange: (v: string) => void; options: ReadonlyArray<ListPageOption>; label: string }

export interface ListPageProps {
  /** The page's heading and its accessible name. */
  title: string;
  onClose: () => void;
  /** Where the page stacks. It must sit above the screen it opens from; anything a row opens must sit above it, or the row closes the page first. */
  zIndex?: number;
  search?: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  sort?: ListPagePick;
  /** Filter chips; exactly one is on. */
  filter?: ListPagePick;
  /** A line under the controls, e.g. how to swipe a row. */
  intro?: ReactNode;
  children: ReactNode;
}

/* A LIST OPENS AS A PAGE (owner 2026-11-19: "replace the dropdown with opening a new page ... then you can sort and filter").
   A long list used to expand in place under a "Show all N" toggle, with nothing to search or sort it by. Each of those is now a
   button that opens this page: a full-screen portal in the app's 520px column, one ← Back, and whichever of a search box, a sort
   and filter chips its list can use. The caller keeps the open flag, the query and the rows; this draws only the frame. */
export default function ListPage({ title, onClose, zIndex = 9500, search, sort, filter, intro, children }: ListPageProps) {
  const field = { minWidth: 0, height: 44, boxSizing: "border-box" as const, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontFamily: "inherit" };
  return createPortal(<div role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, background: C.bg, zIndex, display: "flex", flexDirection: "column", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
      <button onClick={onClose} style={POP_BACK}>{"← Back"}</button>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{title}</div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "14px 16px 40px" }}>
      {search ? <div style={{ position: "relative", marginBottom: 9 }}>
        <input type="search" aria-label={search.label} value={search.value} onChange={e => search.onChange(e.target.value)} placeholder={search.placeholder} style={{ ...field, width: "100%", padding: "0 44px 0 12px", fontSize: 14, outline: "none" }} />
        {search.value ? <button onClick={() => search.onChange("")} aria-label="Clear search" style={{ ...POP_REMOVE, position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)" }}>✕</button> : null}
      </div> : null}
      {sort ? <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12.5, fontWeight: 700, color: C.textSub }}>Sort
        <select aria-label={sort.label} value={sort.value} onChange={e => sort.onChange(e.target.value)} style={{ ...field, flex: 1, padding: "0 10px", fontSize: 13, cursor: "pointer" }}>{sort.options.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
      </label> : null}
      {filter ? <div role="group" aria-label={filter.label} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
        {filter.options.map(o => { const on = filter.value === o[0]; return <button key={o[0]} type="button" aria-pressed={on} onClick={() => filter.onChange(o[0])} style={{ minHeight: 44, padding: "0 13px", borderRadius: 22, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>{o[1]}</button>; })}
      </div> : null}
      {intro ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, margin: "0 2px 10px" }}>{intro}</div> : null}
      {children}
    </div>
  </div>, document.body);
}

/** The line a page shows when its search or filter leaves nothing. */
export function ListPageEmpty({ children }: { children: ReactNode }) {
  return <div style={{ textAlign: "center", padding: "28px 0", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>{children}</div>;
}

import { C } from "../../ClimbMatchCore.jsx";

/** The orders `sortVouches` (core) knows. */
export type VouchSortKey = "new" | "old" | "high" | "low";

export interface VouchSortProps {
  value: VouchSortKey;
  onChange: (k: VouchSortKey) => void;
  /** Unique per screen: ties the visible "Sort" label to the select. */
  id: string;
}

/** The Sort menu over a list of vouches (Newest, Oldest, Highest rated, Lowest rated), right-aligned. Callers show it only when there are two or more to order. Reads `C` at render time. */
export default function VouchSort({ value, onChange, id }: VouchSortProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>Sort</label>
      <select id={id} aria-label="Sort vouches" value={value} onChange={e => onChange(e.target.value as VouchSortKey)} style={{ minHeight: 44, padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.field}`, background: C.surface, color: C.text, fontSize: 12.5, cursor: "pointer" }}>
        <option value="new">Newest</option>
        <option value="old">Oldest</option>
        <option value="high">Highest rated</option>
        <option value="low">Lowest rated</option>
      </select>
    </div>
  );
}

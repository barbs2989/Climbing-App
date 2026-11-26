import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useHomeTowns } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";

/** One row of `places_search` (0544). */
export interface HomeTown {
  id: string;
  name: string;
  region: string;
  country: string;
  county: string | null;
}

/** What the box hands back: the city text, its state/province code, and WHICH town it is (null when typed, not picked). */
export interface HomeTownValue {
  city: string;
  region: string;
  placeId: string | null;
}

export interface HomeTownFieldProps {
  /** The city part of the climber's "City, ST" label. */
  city: string;
  /** The two-letter state or province code already chosen, or "". Ranks that state's towns first. */
  region: string;
  /** The `places.id` the label was picked as, or null. */
  placeId: string | null;
  onChange: (next: HomeTownValue) => void;
  /** The editor's text-box style. */
  inputStyle: CSSProperties;
}

interface HomeTownsQuery {
  data?: HomeTown[];
  isError?: boolean;
  isFetching?: boolean;
  pending?: boolean;
}

/**
 * THE HOME CITY BOX (owner note: "a catalog that indexes all towns and cities so when you type it
 * auto-populates and knows exactly the city it is"). Typing lists matching towns from `places`;
 * picking one fills the city AND its state and records which town it is, so "Mt Vernon" and
 * "Mount Vernon" are one home and two Springfields are two. A town the catalog lacks still saves as
 * typed -- a climber is never kept from naming their home -- and the line under the box says which
 * of the two happened. A failed search says so; it is not "no such town".
 */
export default function HomeTownField({ city, region, placeId, onChange, inputStyle }: HomeTownFieldProps) {
  const [open, setOpen] = useState(false);
  const q: HomeTownsQuery = useHomeTowns(open && !placeId ? city : "", region);
  const rows = q.data || [];
  const settled = !q.pending && !q.isFetching;
  const typed = city.trim();
  const hint: CSSProperties = { fontSize: 11.5, color: C.textMuted, marginTop: 5, lineHeight: 1.45 };
  const label = (t: HomeTown) => t.name + ", " + t.region;
  return (<div>
    <input aria-label="Start typing your city" autoComplete="off" value={city}
      onFocus={() => setOpen(true)}
      onChange={(ev) => { setOpen(true); onChange({ city: ev.target.value.replace(/,.*$/, ""), region, placeId: null }); }}
      onKeyDown={(ev) => { if (ev.key === "Escape") setOpen(false); if (ev.key === "Enter" && rows.length && !placeId) { ev.preventDefault(); const t = rows[0]; onChange({ city: t.name, region: t.region, placeId: t.id }); setOpen(false); } }}
      placeholder="Start typing your city…" style={inputStyle}/>
    {USE_DB && open && !placeId && typed.length >= 2 && rows.length ? <div role="group" aria-label="Matching towns" style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
      {rows.map((t) => <button key={t.id} type="button" onClick={() => { onChange({ city: t.name, region: t.region, placeId: t.id }); setOpen(false); }} aria-label={"Use " + label(t) + (t.county ? ", " + t.county : "")}
        style={{ textAlign: "left", minHeight: 44, padding: "8px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13.5, cursor: "pointer" }}>
        <span style={{ fontWeight: 700 }}>{label(t)}</span>{t.county ? <span style={{ color: C.textMuted, fontSize: 12 }}>{" · " + t.county}</span> : null}
      </button>)}
    </div> : null}
    {!USE_DB || !typed ? null
      : placeId ? <div style={hint}>{"Matched to " + typed + (region ? ", " + region : "") + " on our town list."}</div>
      : q.isError ? <div role="status" style={{ ...hint, color: C.amber }}>{"Couldn’t search towns just now. What you typed will still save."}</div>
      : typed.length >= 2 && settled && !rows.length ? <div style={hint}>{"That town isn’t on our list, so it will show as you typed it."}</div>
      : typed.length >= 2 && rows.length ? <div style={hint}>{"Pick your town from the list so it’s the exact one."}</div>
      : null}
  </div>);
}

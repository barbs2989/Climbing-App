import { useCountries, useStates } from "../../lib/db";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useWideScreen } from "../../lib/wideLayout.js";
import { subdivisionNoun, countryOfArea } from "../../lib/countries";
import { SL } from "../../lib/areaBrowserParts.jsx";
import LoadingRows from "./LoadingRows.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

// ── state picker: exact match for the static "Pick a state" AreaBrowse ──
// The subdivision noun and the country an area sits in come from ./countries, shared with
// the add-a-climb and list/log pickers so the three cannot drift.

export interface StatePickerState { id: string; name: string; route_count?: number | null }
export interface StatePickerProps {
  onPick: (state: StatePickerState) => void;
  C: typeof Palette;
}
export default function StatePicker({ onPick, C }: StatePickerProps) {
  const { data: countries, isLoading: lc, error: ec } = useCountries();
  const { data: states, isLoading, error } = useStates();
  const [countryId, setCountryId] = useState("");
  const wide = useWideScreen();
  // One country is not a choice, it is a dead tap — so skip the step until there are two.
  // The catalog ran on a single root for its whole life and would have shown a pointless
  // "pick a country" select the entire time.
  const only = countries && countries.length === 1 ? countries[0].id : null;
  // A country step that cannot LOAD must not GATE the step below it. `useCountries` has no
  // offline fallback while `useStates` does, so with a downloaded state the climber had the
  // whole catalog in IndexedDB and a greyed-out select in front of it: `country` is "" here,
  // and "" was in the state select's `disabled`. Storing countries would not help -- the
  // download filters `path cd st.path` (ltree `<@`), which stores the state and its
  // DESCENDANTS, and a country is an ancestor. Same reasoning as `only` one line up: when the
  // step cannot be offered it must not be required. `inCountry` already falls through to every
  // state when `country` is "", so the list below is correct as it stands.
  const noCountryStep = !!only || !!ec;
  const country = countryId || only || "";
  const noun = subdivisionNoun(country);
  const inCountry = (states || []).filter((x: StatePickerState) => !country || countryOfArea(x) === country);
  // THE WEBSITE (lib/wideLayout.js): a desktop has the room to SHOW the regions instead of hiding
  // them in a select, the way Mountain Project's location directory does — the countries as
  // buttons (only when there are two or more) and every region as a card with its climb count.
  // Same data, same onPick, same loading and failure wording as the phone selects below.
  if (wide) {
    const card: CSSProperties = { textAlign: "left", background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", cursor: "pointer", color: C.text };
    return (
      <div style={{ marginBottom: 14 }}>
        {only ? null : (
          <div style={{ marginBottom: 14 }}>
            <SL C={C}>Pick a country</SL>
            {lc ? <LoadingRows C={C} label="Loading countries…"/>
              : ec && !(countries && countries.length) ? <div style={{ color: C.red, fontSize: 12.5 }}>{"Couldn’t load countries — the " + noun + "s below are every one we have."}</div>
              : <div role="radiogroup" aria-label="Country" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(countries || []).map(c => { const on = country === c.id; return <button key={c.id} role="radio" aria-checked={on} onClick={() => setCountryId(on ? "" : c.id)} style={{ padding: "9px 14px", borderRadius: 999, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.card, color: on ? C.onSolid : C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{c.name}{c.route_count != null ? <span style={{ color: on ? C.blue : C.textMuted, fontWeight: 600 }}>{" · " + c.route_count.toLocaleString()}</span> : null}</button>; })}</div>}
          </div>
        )}
        <SL C={C}>{`Pick a ${noun}`}</SL>
        {!country && !noCountryStep ? <div style={{ color: C.textMuted, fontSize: 13 }}>{"Choose a country above to see its " + noun + "s."}</div>
          : isLoading ? <div style={{ color: C.textMuted, fontSize: 13 }}>{`Loading ${noun}s…`}</div>
          : inCountry.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>{inCountry.map((s: StatePickerState) => <button key={s.id} onClick={() => onPick(s)} style={card}><div style={{ fontSize: 14.5, fontWeight: 700, overflowWrap: "anywhere" }}>{s.name}</div>{s.route_count != null ? <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{s.route_count.toLocaleString() + (s.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
          : error ? <div style={{ color: C.red, fontSize: 12.5 }}>{"Couldn't load " + noun + "s — check your connection and try again."}</div>
          : <div style={{ color: C.textMuted, fontSize: 13 }}>{`No ${noun}s found`}</div>}
        {error && states && states.length ? <div style={{ color: C.textMuted, fontSize: 12.5, marginTop: 8 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
      </div>
    );
  }
  const phoneGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
  const phoneCard: CSSProperties = { textAlign: "left", minWidth: 0, minHeight: 56, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", cursor: "pointer", color: C.text, fontFamily: "inherit" };
  const phoneCardName: CSSProperties = { fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" };
  const phoneCardSub = { fontSize: 12, color: C.textMuted, marginTop: 2 };
  const selStyle: CSSProperties = { width: "100%", WebkitAppearance: "none", appearance: "none", background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 34px 13px 13px", fontSize: 15, fontWeight: 600 };
  return (
    <div style={{ marginBottom: 14 }}>
      {only ? null : (
        <div style={{ marginBottom: 10 }}>
          <SL C={C}>Pick a country</SL>
          <select aria-label="Select a country" value={country} disabled={lc || !countries}
            onChange={e => setCountryId(e.target.value)}
            style={{ ...selStyle, cursor: lc || !countries ? "default" : "pointer" }}>
            <option value="">{lc ? "Loading countries…" : (countries && countries.length) ? "Select a country…" : ec ? "Couldn’t load countries" : "No countries found"}</option>
            {(countries || []).map(c => <option key={c.id} value={c.id}>{c.name + (c.route_count != null ? ` — ${c.route_count.toLocaleString()} climb${c.route_count === 1 ? "" : "s"}` : "")}</option>)}
          </select>
        </div>
      )}
      <SL C={C}>{`Pick a ${noun}`}</SL>
      {/* The placeholder used to fall back on `isLoading || !states`, so a FAILED load -- where
          isLoading is false but states is undefined -- left the control reading "Loading states…"
          forever, directly above the error message saying it could not load. Two statements
          contradicting each other, and the app looks hung rather than broken. This is the
          poor-signal path, which for a climbing app is not an edge case. */}
      <select aria-label={`Select a ${noun}`} value="" disabled={isLoading || !states || (!country && !noCountryStep)} onChange={e => { const s = (states || []).find((x: StatePickerState) => x.id === e.target.value); if (s) onPick(s); }} style={{ ...selStyle, opacity: (country || noCountryStep) ? 1 : 0.55, cursor: isLoading || !states || (!country && !noCountryStep) ? "default" : "pointer" }}>
        {/* Data outranks error. A failed REFETCH leaves the previous list intact, so the
            options below are still listed and still work — saying "Couldn’t load states"
            above a populated dropdown contradicts what the user can plainly see, and
            hides a list that is genuinely usable. Only claim failure when there is
            nothing to show. Offline this is the common case, not a rare one: the refetch
            cannot succeed, and the list it already has is exactly what was wanted. */}
        <option value="">{!country ? "Choose a country first" : isLoading ? `Loading ${noun}s…` : inCountry.length ? `Select a ${noun}…` : error ? `Couldn’t load ${noun}s` : `No ${noun}s found`}</option>
        {inCountry.map((s: StatePickerState) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 9, lineHeight: 1.5 }}>Tap through to drill in to its crags and climbs. Open any area's route list to filter and search by type, grade, stars and more.</div>
      {/* THE SAME LIST AS CARDS under the selects (2026-10-24). On a phone this screen was two
          dropdowns over a screen of empty dark space; the website already lays the countries and
          regions out as cards, the way Mountain Project's directory does. Same data and same
          onPick/setCountryId as the selects above, which stay (check:ui drives them), so the
          cards add a way in and take none away. Nothing new is loaded. */}
      {!country && !noCountryStep && countries && countries.length > 1 ? (
        <div style={{ marginTop: 16 }}>
          <SL C={C}>Countries</SL>
          <div style={phoneGrid}>{countries.map(c => <button key={c.id} onClick={() => setCountryId(c.id)} style={phoneCard}><div style={phoneCardName}>{c.name}</div>{c.route_count != null ? <div style={phoneCardSub}>{c.route_count.toLocaleString() + (c.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
        </div>
      ) : null}
      {(country || noCountryStep) && inCountry.length ? (
        <div style={{ marginTop: 16 }}>
          <SL C={C}>{`All ${noun}s`}</SL>
          <div style={phoneGrid}>{inCountry.map((s: StatePickerState) => <button key={s.id} onClick={() => onPick(s)} style={phoneCard}><div style={phoneCardName}>{s.name}</div>{s.route_count != null ? <div style={phoneCardSub}>{s.route_count.toLocaleString() + (s.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
        </div>
      ) : null}
      {isLoading ? <LoadingRows C={C} label="Loading states…" style={{marginTop: 8}}/> : null}
      {/* Same split: red is for "you have nothing", muted is for "this may be out of date".
          Telling someone to check their connection is useless advice when the list they
          asked for is already on screen and working. */}
      {error && !(states && states.length) ? <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>Couldn't load states — check your connection and try again.</div> : null}
      {error && states && states.length ? <div style={{ color: C.textMuted, fontSize: 12.5, marginTop: 8 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
    </div>
  );
}

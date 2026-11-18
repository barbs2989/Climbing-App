import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useDeviceSearch, useDeviceSearchScope } from "../../lib/db";
import { warmDeviceSearch } from "../../lib/offline";
import { parseTypedSearch } from "../../lib/typedSearch.js";
import { ATYPE } from "../../lib/areaBrowserShared.js";
import { hlMatch } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import LoadingRows from "./LoadingRows.tsx";
import EmptyState from "./EmptyState.tsx";
import RouteRow from "./RouteRow.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";

export interface DownloadedSearchArea { id: string; name: string; area_type: keyof typeof ATYPE; route_count?: number | null; where?: string }
export interface DownloadedSearchRoute extends RouteRowRoute { id: string; name: string; areaName?: string | null }
export interface DownloadedSearchProps {
  C: typeof Palette;
  /** App's downloaded state names: a download finishing or a state removed starts a fresh search. */
  downloaded: string[];
  onOpenArea: (a: DownloadedSearchArea) => void;
  onOpenRoute: (r: DownloadedSearchRoute) => void;
  /** Opens Manage areas, where a state is pinned (and so downloaded). */
  onManageAreas: () => void;
  /** Opens the Climbs map at the climber's position. */
  onNearMe: () => void;
  /** Opens the Route finder on a downloaded place with the filters typed ("5.9 trad", "WI4"). */
  onOpenFinder?: (req: DownloadedSearchFinderReq) => void;
}
export interface DownloadedSearchFinderReq {
  loc: { id: string; name: string; area_type: string };
  filters: { discs: string[]; gSys: string; gLo: string; gHi: string };
}

/* THE PHONE'S CLIMBS SEARCH (owner 2026-11-18): "allow users to search for areas and routes straight
   from the main climbs tab page ... only areas or routes they have downloaded should show up ... have
   it separated by routes and areas like we do on areas pages". The Areas | Routes switch and box are
   the area page's (DbSearchSplit); what it searches is the DEVICE — every downloaded state and every
   climb saved on its own — so it answers the same with no signal. With nothing downloaded it says so
   and offers Manage areas instead of an empty box that can never find anything. The website has its
   own two boxes in the top bar and never mounts this. */
export default function DownloadedSearch({ C, downloaded, onOpenArea, onOpenRoute, onManageAreas, onNearMe, onOpenFinder }: DownloadedSearchProps) {
  const [mode, setMode] = useState<"areas" | "routes">("areas");
  const [q, setQ] = useState("");
  const qq = q.trim();
  const salt = downloaded.slice().sort().join("|");
  const scopeQ = useDeviceSearchScope(salt);
  const areasQ = useDeviceSearch("areas", mode === "areas" ? qq : "", salt);
  const routesQ = useDeviceSearch("routes", mode === "routes" ? qq : "", salt);
  // Read the names into memory before the first keystroke, so the first search does not wait on it.
  useEffect(() => { if (downloaded.length) warmDeviceSearch(); }, [salt]); // eslint-disable-line react-hooks/exhaustive-deps -- salt IS the downloaded list, as one comparable string
  /* A GRADE OR A TYPE IS A FILTER, NOT A NAME (walkthrough 2026-11-18): "5.9 trad", "WI4" and "5.10
     sport near Leavenworth" matched no climb's name and said so. As the website's Routes box does, the
     words are read as Route finder filters and offered as a row, on what is downloaded: the place typed
     when it is on this phone, else each downloaded state. */
  const typed = useMemo(() => (onOpenFinder ? parseTypedSearch(qq) : null), [qq, onOpenFinder]);
  const placeQ = useDeviceSearch("areas", typed && typed.place ? typed.place : "", salt, 1);
  const scope = scopeQ.data;
  const states: string[] = scope ? scope.states : [];
  const packs = scope ? scope.packs : 0;
  const nothing = !!scope && !states.length && !packs;
  const tab = (on: boolean): CSSProperties => ({ flex: 1, minHeight: 40, padding: "7px 0", textAlign: "center", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 7, border: "none", background: on ? C.blueSolid : "transparent", color: on ? C.onSolid : C.textSub });
  const row: CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", minHeight: 44, cursor: "pointer", border: "none", borderBottom: "1px solid " + C.borderLight, background: "transparent", color: C.text, textAlign: "left" };
  const covers = states.length || packs
    ? "Searching what’s on this phone: " + [states.join(", "), packs ? packs + (packs === 1 ? " saved climb" : " saved climbs") : ""].filter(Boolean).join(" · ")
    : "";
  const finderScopes: { id: string; name: string; area_type: string }[] = !typed ? []
    : typed.place ? ((placeQ.data && placeQ.data.rows[0]) ? [placeQ.data.rows[0]] : [])
    : (scope ? scope.stateRows : []);
  const finderRows = typed && onOpenFinder ? finderScopes.map(sc => (
    <button key={"finder-" + sc.id} onClick={() => onOpenFinder({ loc: { id: sc.id, name: sc.name, area_type: sc.area_type }, filters: { discs: typed.discs, gSys: typed.gSys, gLo: typed.gLo, gHi: typed.gHi } })} style={row}>
      <ActionIcon name="explore" size={17} color={C.blue}/>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.blue, overflowWrap: "anywhere" }}>{typed.label + " in " + sc.name}</span>
        <span style={{ display: "block", fontSize: 11.5, color: C.textMuted }}>Open the Route finder with these filters</span>
      </span>
    </button>
  )) : [];
  const q0 = mode === "areas" ? areasQ : routesQ;
  const res = q0.data;
  const busy = !!qq && (q0.isLoading || q0.isPlaceholderData);
  const nearMe = <button onClick={onNearMe} style={{ ...row, borderBottom: "none", padding: "8px 2px" }}><ActionIcon name="pin" size={17} color={C.blue}/><span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>Near me</span><span style={{ fontSize: 12, color: C.textMuted }}>climbs around you, on the map</span></button>;
  if (nothing) return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: C.text, marginBottom: 6 }}><ActionIcon name="search" size={17} color={C.textMuted}/>Search your downloaded climbs</div>
      <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5, marginBottom: 10 }}>Search finds the areas and climbs you’ve downloaded to this phone, and works with no signal. Pin a state to download it.</div>
      <button onClick={onManageAreas} style={{ minHeight: 44, padding: "8px 16px", borderRadius: 22, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.text, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Manage areas</button>
      {nearMe}
    </div>
  );
  return (
    <div>
      <div role="group" aria-label="Search for" style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        <button onClick={() => setMode("areas")} aria-pressed={mode === "areas"} style={tab(mode === "areas")}>Areas</button>
        <button onClick={() => setMode("routes")} aria-pressed={mode === "routes"} style={tab(mode === "routes")}>Routes</button>
      </div>
      <div style={{ position: "relative" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 12, top: 0, height: 44, display: "flex", alignItems: "center", pointerEvents: "none" }}><ActionIcon name="search" size={18} color={C.textMuted}/></span>
        <input type="search" enterKeyHint="search" value={q} onChange={e => setQ(e.target.value)} aria-label={mode === "areas" ? "Search your downloaded areas" : "Search your downloaded routes"} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes…"} style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 12px 0 38px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 15, outline: "none" }}/>
      </div>
      {/* What it covers, and the way to change that: with a state downloaded nothing else on this screen leads to Manage areas. */}
      {covers ? <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px 0" }}><span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: C.textMuted, lineHeight: 1.4, overflowWrap: "anywhere" }}>{covers}</span><button onClick={onManageAreas} aria-label="Manage downloaded areas" style={{ flexShrink: 0, minHeight: 36, padding: "4px 2px 4px 8px", border: "none", background: "transparent", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Manage</button></div> : null}
      {!qq ? nearMe : (
        // The hits run down the page, as the area page's do: no inner scroll box.
        <div style={{ marginTop: 6 }} aria-busy={busy || undefined}>
          {q0.isError ? <div role="alert" style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>{mode === "areas" ? "Couldn’t search your downloaded areas — try again." : "Couldn’t search your downloaded routes — try again."}</div>
            // An EMPTY answer held from the last words is not an answer for these: still searching, say so.
            : !res || (busy && !res.rows.length) ? <LoadingRows C={C} label="Searching your downloads…" style={{ padding: "14px 4px" }}/>
            : !res.rows.length && finderRows.length ? <div>{finderRows}</div>
            : !res.rows.length ? <EmptyState C={C} icon="search" action={<button onClick={onManageAreas} style={{ minHeight: 40, padding: "6px 14px", borderRadius: 20, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Manage areas</button>}>{(mode === "areas" ? "No downloaded areas match “" : "No downloaded routes match “") + qq + "”. Places you haven’t downloaded don’t show here."}</EmptyState>
            : <div style={{ opacity: busy ? 0.5 : 1 }}>
              {finderRows}
              {mode === "areas"
                ? (res.rows as DownloadedSearchArea[]).map(a => (
                  <button key={a.id} onClick={() => onOpenArea(a)} style={row}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, lineHeight: 1.3, overflowWrap: "anywhere" }}>{hlMatch(a.name, qq)}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, overflowWrap: "anywhere" }}>{[ATYPE[a.area_type] || a.area_type, a.where].filter(Boolean).join(" · ")}</span>
                    </span>
                    {a.route_count ? <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{a.route_count + (a.route_count === 1 ? " climb" : " climbs")}</span> : null}
                  </button>
                ))
                : (res.rows as DownloadedSearchRoute[]).map(r => <RouteRow key={r.id} r={r} onOpen={() => onOpenRoute(r)} C={C} highlight={qq} areaName={r.areaName || null}/>)}
              {res.total > res.rows.length ? <div style={{ fontSize: 11.5, color: C.textMuted, padding: "10px 4px", textAlign: "center" }}>{"Closest " + res.rows.length + " of " + res.total.toLocaleString() + " — keep typing to narrow."}</div> : null}
            </div>}
        </div>
      )}
    </div>
  );
}

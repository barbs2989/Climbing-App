// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchArea, useArea, fetchAreaBreadcrumb } from "./db";
import { POP_BACK } from "./popupChrome.js";
import { ScreenHero } from "./ScreenHero";
import { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows } from "./nearbyPeaks.js";
import { ClimberCtx } from "./climberCtx.js";
import SummitBriefing from "../src/components/SummitBriefing.tsx";
import ObjectivesPanel from "../src/components/ObjectivesPanel.tsx";
import StatePicker from "../src/components/StatePicker.tsx";
import DbAreaTree from "../src/components/DbAreaTree.tsx";
import NearMePanel from "../src/components/NearMePanel.tsx";
import AreaPage from "../src/components/AreaPage.tsx";
import RouteFinderPanel from "../src/components/RouteFinderPanel.tsx";
export { SummitBriefing };
export { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows };


// TOP CONTRIBUTORS used to be forked here — a second implementation of the panel that
// ClimbMatchCore already owns. The fork is why the crag page rendered `c.contributor`, an auth
// uid, as a person's name: the good copy resolved profiles and this one never learned to, and
// nothing tied them together. #945 fixed the symptom; deleting the fork is what stops it
// recurring. The shared component arrives as a prop for the same reason `C` and `ActionIcon`
// do — this file must not import ClimbMatchCore, which lazy-imports this module and would make
// the cycle static.


export default function DbAreaBrowser({ jumpToFinderReq, onSignIn, onOpenRoute, C, bookmarks, onToggleBookmark, wishlist, profile, completedIds, rankSuggested, discSlots, jumpToStateReq, jumpToAreaReq, uElev, uElevN, uElevUnit, uDistMi, onAreaContext, onFireMap, onAddClimb, onAddArea, TopContributors, rootHeader, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, onGroupsHere, openCrewCountAt, onToggleWish, userLists, onToggleListRoute }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"
  const [finderDisc, setFinderDisc] = useState(""); // a chart bar presets the finder's discipline
  const [finderInit, setFinderInit] = useState(null); // a saved search being reopened: { id, q, filters }
  const [treeOpen, setTreeOpen] = useState(false);
  const climber = useMemo(() => ({ wishlist, profile, completedIds, rankSuggested, discSlots }), [wishlist, profile, completedIds, rankSuggested, discSlots]);
  const handledJumpId = useRef(null);

  const current = stack.length ? stack[stack.length - 1] : stateNode;
  const crumbs = stateNode ? [stateNode, ...stack] : [];

  // Report where the user is browsing to the parent. This exists because App's
  // `selArea` is only ever written on the SEED catalog path, and production builds
  // set VITE_USE_DB=true — so anything outside this component that wanted "the area
  // being looked at" got null in the deployed app. The Fire map's focus point was
  // exactly that: it worked locally on seed data and could never fire in production.
  // Reported as a plain {id,name,lat,lng,areaType} rather than the row itself, so the
  // consumer cannot come to depend on the DB shape.
  useEffect(() => {
    if (!onAreaContext) return;
    // Reported WHETHER OR NOT the area has a coordinate. It used to be null without one, and
    // the only consumer left (area Discussion) then never rendered on an area such as Florida's
    // "Artificial Boulders" (fl_artificial_boulders: 30 climbs, lat/lng null). A consumer that
    // needs a position checks lat/lng itself.
    onAreaContext(current
      ? { id: current.id, name: current.name, lat: current.lat != null ? current.lat : null, lng: current.lng != null ? current.lng : null, areaType: current.area_type }
      : null);
  }, [onAreaContext, current && current.id, current && current.lat, current && current.lng]); // eslint-disable-line react-hooks/exhaustive-deps -- report the area context only when the area identity or position changes; current is a fresh object each render and onAreaContext is listed

  const jump = i => {
    setScreen("areas");
    if (i < 0) { setStateNode(null); setStack([]); return; }
    if (i === 0) { setStack([]); return; }
    setStack(crumbs.slice(1, i + 1));
  };
  const back = () => jump(crumbs.length - 2);
  const drill = a => { setScreen("areas"); setStack(s => [...s, a]); };
  const pickState = s => { setStateNode(s); setStack([]); setScreen("areas"); };

  // Lets a parent screen (e.g. the "Manage areas" list) jump straight into a
  // state from outside this component's own drill-down navigation.
  useEffect(() => {
    if (!jumpToStateReq || handledJumpId.current === jumpToStateReq.id) return;
    handledJumpId.current = jumpToStateReq.id;
    pickState(jumpToStateReq.state);
  }, [jumpToStateReq]);
  // Jump straight to any area reached by something other than drilling — a
  // near-me map pin, a tree-search hit, or a tree-node tap — by rebuilding its
  // real state/region breadcrumb from the area's own ltree path.
  // Every await below is guarded by a sequence number: two jumps in flight at once
  // (tap a search hit, tap another before the first resolves) could otherwise land
  // out of order and leave the browser on the earlier area.
  const jumpSeq = useRef(0);
  const jumpToArea = async a => {
    const seq = ++jumpSeq.current;
    setTreeOpen(false);
    setStateNode(a); setStack([]); setScreen("areas");
    // areas_in_subtree returns a narrow projection with no `path`, so a search hit
    // cannot build its own breadcrumb and every panel keyed on path renders empty.
    // Hydrate the full row before navigating.
    let full = a;
    if (!a.path) {
      const row = await fetchArea(a.id).catch(() => null);
      if (jumpSeq.current !== seq) return false;
      if (row) { full = row; setStateNode(row); }
    }
    const ancestors = await fetchAreaBreadcrumb(full).catch(() => []);
    if (jumpSeq.current !== seq) return false;
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return true;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), full]);
    return true;
  };
  // Saved-areas chips (and anything outside the browser) jump to a DB area by id;
  // the full row is fetched here because jumpToArea needs area_type + ltree path.
  const handledAreaJump = useRef(null);
  const jumpAreaRowQ = useArea(jumpToAreaReq ? jumpToAreaReq.areaId : null);
  useEffect(() => {
    if (!jumpToAreaReq || handledAreaJump.current === jumpToAreaReq.id || !jumpAreaRowQ.data) return;
    handledAreaJump.current = jumpToAreaReq.id;
    jumpToArea(jumpAreaRowQ.data);
  }, [jumpToAreaReq, jumpAreaRowQ.data]);
  // A SAVED SEARCH reopened from Logbook › Saved or the Menu: go to the area it was saved in, then
  // open the finder there with its words and filters, as the climber left it.
  const handledFinderJump = useRef(null);
  const finderLocQ = useArea(jumpToFinderReq && jumpToFinderReq.search.loc ? jumpToFinderReq.search.loc.id : null);
  useEffect(() => {
    if (!jumpToFinderReq || handledFinderJump.current === jumpToFinderReq.id) return;
    if (finderLocQ.isError) { handledFinderJump.current = jumpToFinderReq.id; if (notify) notify("Couldn’t open that saved search — check your connection and try again."); return; }
    if (!finderLocQ.data) return;
    handledFinderJump.current = jumpToFinderReq.id;
    const req = jumpToFinderReq;
    jumpToArea(finderLocQ.data).then(ok => {
      if (!ok) return;
      setFinderDisc("");
      setFinderInit({ id: req.id, q: req.search.q, filters: req.search.filters });
      setScreen("finder");
    });
  }, [jumpToFinderReq, finderLocQ.data, finderLocQ.isError, notify]);

  return (
    <ClimberCtx.Provider value={climber}>
    <div>
      {/* Breadcrumb + Back. Sticky, and rendered on EVERY sub-screen — not just "areas".
          Two reports drove both halves. It used to scroll away on a long area page, so on
          anything below the fold there was no way back without scrolling to the top. And it
          was gated on `screen === "areas"`, so opening "View map" (screen "near") removed the
          only ← Back on the page: the map's own chrome is a List/Map segmented toggle, which
          reads as a view switch rather than an exit, and nothing else said how to get out.
          On a sub-screen Back returns to the area page rather than popping the area stack —
          the panel is a layer over the area you are standing on, not a step deeper into it.
          The owner then reported both halves as too hard to use: a small grey "← Back" was
          hard to find, and the path, squeezed into one sideways-scrolling line beside it, was
          cut off. So the bar is now two rows and taller on purpose — a Back button that NAMES
          where it goes (drawn with POP_BACK since 2026-09-25, like every other Back in the app:
          44px tall with a bright edge, so it is still easy to find without its own colour), and under it the full path, WRAPPING rather than scrolling,
          so every level above you is visible and tappable. */}
      {crumbs.length ? (
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: C.bg, paddingBottom: 10, marginBottom: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, background: C.surface, border: "1px solid " + C.borderHi, borderRadius: 12, padding: "11px 12px" }}>
            <button onClick={() => { if (screen !== "areas") setScreen("areas"); else back(); }} style={{ ...POP_BACK, alignSelf: "flex-start", maxWidth: "100%" }}>
              <span aria-hidden="true">{"←"}</span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{"Back to " + (screen !== "areas" ? current.name : crumbs.length >= 2 ? crumbs[crumbs.length - 2].name : "All areas")}</span>
            </button>
            {/* On an area page the path stops at the PARENT: the area you are in is the header box
                right below, so naming it here in bold too said it twice. On a sub-screen (Route
                finder, Map…) the area stays in the path as the way back to its page. A path that
                would only repeat the Back button above it (just "All areas") is not drawn. */}
            {(() => {
              const path = screen === "areas" ? [null, ...crumbs.slice(0, -1)] : [null, ...crumbs];
              return path.length < 2 ? null : (
                <nav aria-label="Area path" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, columnGap: 6, minWidth: 0 }}>
                  {path.map((c, i) => (
                    <span key={c ? c.id : "root"} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, maxWidth: "100%" }}>
                      {i > 0 ? <span aria-hidden="true" style={{ color: C.textMuted, fontSize: 16, fontWeight: 700 }}>{"›"}</span> : null}
                      <button onClick={() => { setScreen("areas"); jump(c ? i - 1 : -1); }} style={{ background: "transparent", border: "none", color: C.blue, fontSize: 14.5, cursor: "pointer", fontWeight: 700, padding: "2px 0", textAlign: "left", lineHeight: 1.3, overflowWrap: "anywhere" }}>{c ? c.name : "All areas"}</button>
                    </span>
                  ))}
                </nav>
              );
            })()}
          </div>
        </div>
      ) : null}
      {!stateNode ? (
        <>{rootHeader || null}<StatePicker onPick={pickState} C={C} /></>
      ) : screen === "finder" ? (
        <RouteFinderPanel key={current.id + (finderInit ? ":" + finderInit.id : "")} initial={finderInit} uid={uid} notify={notify} onSignIn={onSignIn} scope={current} onOpen={onOpenRoute} onJumpToArea={jumpToArea} C={C} uElevN={uElevN} uElevUnit={uElevUnit} presetDisc={finderDisc} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} onToggleWish={onToggleWish} userLists={userLists} onToggleListRoute={onToggleListRoute} onAddClimb={onAddClimb} onAddArea={onAddArea} />
      ) : screen === "objectives" ? (
        <ObjectivesPanel area={current} onOpen={onOpenRoute} C={C} />
      ) : screen === "near" ? (
        <><ScreenHero C={C} title={"Map" + (current ? " · " + current.name : "")} /><NearMePanel uDistMi={uDistMi} name={current ? current.name : null} center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} areaType={current && current.area_type} onBack={() => setScreen("areas")} onOpenArea={jumpToArea} C={C} /></>
      ) : (
        <AreaPage key={current.id} onSignIn={onSignIn} TopContributors={TopContributors} onFireMap={onFireMap} onAddClimb={onAddClimb} onAddArea={onAddArea} PartnerRow={PartnerRow} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} onGroupsHere={onGroupsHere} openCrewCountAt={openCrewCountAt} uElev={uElev} uDistMi={uDistMi} area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={d => { setFinderInit(null); setFinderDisc(typeof d === "string" ? d : ""); setScreen("finder"); }} onSuggestAreaEdit={onSuggestAreaEdit} myId={myId} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onAllAreas={() => setTreeOpen(true)} onOpenRoute={onOpenRoute} onJumpToArea={jumpToArea} C={C} />
      )}
      {treeOpen && stateNode ? (
        <DbAreaTree stateRoot={stateNode} current={current} ancestorIds={stack.map(a => a.id)} onNavigate={jumpToArea} onClose={() => setTreeOpen(false)} C={C} />
      ) : null}
    </div>
    </ClimberCtx.Provider>
  );
}

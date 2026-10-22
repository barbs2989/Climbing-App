import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { C } from "../ClimbMatchCore.jsx";
import { packRouteWithSnapshot, usePackMeta, useRoutesByIds, dbRouteToCamel } from "./db.js";
import { unpackRouteOffline, packedRouteIds, savedAgo } from "./offline";
import { routeMapInfo } from "./offlineTiles";
import { warmLeafletOffline } from "./mapKit";

/* SAVE THIS MAP FOR OFFLINE — the route map, from the trailhead (or parking) to the climb, on the
   device, one climb at a time. It came back after #2368 removed the trip pack: a state download
   saves the whole catalog but never map tiles (OSM, Esri and OpenTopoMap all forbid bulk download),
   so with the pack gone nothing could put a map on a phone. What AllTrails and Gaia GPS do: a
   download button ON the map, a progress count while it runs, the saved state shown in place,
   and a list of saved maps to open or delete. That is this file.

   WHAT A SAVE WRITES (lib/db.js packRouteWithSnapshot): the route row and its latest reports and
   corrections, so the page OPENS with no signal even in a state that was never downloaded, and the
   USGS tiles along the way in (lib/offlineTiles.js). Never a forecast (owner, 2026-10-21). The
   message says how much of the map actually landed — a save that mostly failed does not say "saved".

   US only in practice: the USGS tiles hold little outside the US, and a save there reports what
   fraction it got rather than claiming the map. */

function mapPct(m) { return m && m.total ? Math.round(100 * m.tiles / m.total) : 0; }

// The state of one route's saved map: null = not saved; { tiles, total, missing, at }.
function useSavedMap(routeId) {
  const [info, setInfo] = useState(undefined);
  const load = function () {
    return Promise.all([routeMapInfo(), packedRouteIds().catch(function () { return []; })]).then(function (r) {
      const m = r[0][routeId];
      setInfo(m && r[1].indexOf(routeId) >= 0 ? m : null);
    }).catch(function () { setInfo(null); });
  };
  useEffect(function () { setInfo(undefined); load(); }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps -- load closes over routeId only
  return [info, load];
}

const btn = { padding: "7px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer", minHeight: 36 };

export function SaveMapOffline({ routeId, notify }) {
  const [info, reload] = useSavedMap(routeId);
  const [busy, setBusy] = useState(false), [prog, setProg] = useState(null);
  const qc = useQueryClient();
  const say = function (m) { if (notify) notify(m); };
  const save = function () {
    if (busy) return;
    setBusy(true); setProg(null); warmLeafletOffline();
    packRouteWithSnapshot(routeId, { onMapProgress: setProg }).then(function (res) {
      const m = res && res.map;
      if (!m || !m.total) { say("This climb has no location on file, so there is no map to save."); return unpackRouteOffline(routeId); }
      if (!m.ok) { say(m.reason === "quota" ? "The map didn’t fit on this device — free some space and try again." : "Couldn’t download the map — try again with a better signal."); return unpackRouteOffline(routeId); }
      say(m.missing ? "Saved " + Math.round(100 * m.saved / m.total) + "% of the map — tap Retry with a better signal for the rest." : "Map saved on this device — the way in and this page open with no signal.");
    }).catch(function (e) { say("Couldn’t save the map — " + ((e && e.message) || "check your connection")); })
      .finally(function () { setBusy(false); setProg(null); reload(); qc.invalidateQueries({ queryKey: ["pack-meta"] }); });
  };
  const remove = function () {
    unpackRouteOffline(routeId).then(function () { say("Map removed from this device"); }, function () { say("Couldn’t remove the map — it’s still on this device."); })
      .finally(function () { reload(); qc.invalidateQueries({ queryKey: ["pack-meta"] }); });
  };
  if (info === undefined) return null;
  const pct = mapPct(info), partial = info && info.missing > 0;
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
    {busy ? <span role="status" style={{ fontSize: 12.5, color: C.textSub, fontWeight: 600 }}>{"Saving map… " + (prog && prog.total ? Math.round(100 * prog.done / prog.total) + "%" : "")}</span>
      : info ? <>
        <span style={{ fontSize: 12.5, color: partial ? C.amber : C.green, fontWeight: 700, flex: 1, minWidth: 0 }}>{partial ? pct + "% of the map saved offline" : "✓ Map saved offline · " + savedAgo(info.at)}</span>
        {partial ? <button onClick={save} style={btn}>Retry</button> : null}
        <button onClick={remove} aria-label="Remove the saved map from this device" style={{ ...btn, color: C.textSub }}>Remove</button>
      </>
      : <button onClick={save} style={btn}>⤓ Save map offline</button>}
  </div>;
}

/* Every saved map on this device, for Manage areas: open one, or take it off. Names come through
   useRoutesByIds, which falls back to the saved row itself with no signal. */
export function SavedRouteMaps({ onOpen, notify }) {
  const metaQ = usePackMeta();
  const qc = useQueryClient();
  const metas = (metaQ.data || []).filter(function (m) { return !m.seed && m.mapTiles > 0; });
  const rowsQ = useRoutesByIds(metas.map(function (m) { return m.id; }));
  if (!metas.length) return null;
  const byId = {}; (rowsQ.data || []).forEach(function (r) { byId[r.id] = r; });
  const remove = function (id) {
    unpackRouteOffline(id).then(function () { if (notify) notify("Map removed from this device"); }, function () { if (notify) notify("Couldn’t remove the map — it’s still on this device."); })
      .finally(function () { qc.invalidateQueries({ queryKey: ["pack-meta"] }); });
  };
  return <section aria-label="Saved route maps" style={{ marginTop: 18 }}>
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>{"Saved route maps · " + metas.length}</div>
    {metas.map(function (m) {
      const r = byId[m.id];
      const name = r ? r.name : (rowsQ.isLoading ? "Loading…" : "A saved climb");
      const pct = m.mapTotal ? Math.round(100 * m.mapTiles / m.mapTotal) : 0;
      return <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: C.card, border: "1px solid " + C.border, borderRadius: 11, marginBottom: 8 }}>
        <button onClick={function () { if (r && onOpen) onOpen(dbRouteToCamel(r)); }} disabled={!r} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: r ? "pointer" : "default", color: C.text }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 11.5, color: m.mapMissing ? C.amber : C.textMuted }}>{(r && r.areas && r.areas.name ? r.areas.name + " · " : "") + (m.mapMissing ? pct + "% of the map saved" : "map saved " + savedAgo(m.mapAt))}</div>
        </button>
        <button onClick={function () { remove(m.id); }} aria-label={"Remove the saved map of " + name} style={{ ...btn, color: C.textSub }}>Remove</button>
      </div>;
    })}
  </section>;
}

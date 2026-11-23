import { tx } from "./tapWords.js";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { C, MeH } from "../ClimbMatchCore.jsx";
import SwipeRow from "../src/components/SwipeRow.tsx";
import { useWideScreen } from "./wideLayout.js";
import { packRouteWithSnapshot, usePackMetaStrict, useRoutesByIds, dbRouteToCamel } from "./db.js";
import { unpackRouteOffline, packMeta, savedAgo } from "./offline";
import { warmLeafletOffline } from "./mapKit";

/* SAVE THIS MAP FOR OFFLINE — the route map, from the trailhead (or parking) to the climb, on the
   device, one climb at a time. It came back after #2368 removed the trip pack: a state download
   saves the whole catalog but never map tiles (OSM, Esri and OpenTopoMap all forbid bulk download),
   so with the pack gone nothing could put a map on a phone. What AllTrails and Gaia GPS do: a
   download button ON the map, a progress count while it runs, the saved state shown in place,
   and a list of saved maps to open or delete. That is this file.

   WHAT A SAVE WRITES (lib/db.js packRouteWithSnapshot): the route row and its latest reports and
   corrections, so the page OPENS with no signal even in a state that was never downloaded, the
   climbers' tracks, area row and neighbouring climbs, the route's photos and topos (newest 40
   photos; lib/db.js savePackMedia), and the USGS tiles along the way in (lib/offlineTiles.js).
   Never a forecast (owner, 2026-10-21). The
   message says how much of the map actually landed — a save that mostly failed does not say "saved".

   US only in practice: the USGS tiles hold little outside the US, and a save there reports what
   fraction it got rather than claiming the map.

   THE PAGE IS KEPT WHEN THE MAP FAILS (owner, 2026-11-19: a saved climb opens "that route page" with
   no service). A save used to be thrown away whole when no tile landed, so a climb in Canada, or one
   saved on a weak signal, could not be kept at all. Now the row, reports and corrections stay and the
   line says the map is not saved, with Retry. The button reads "Save offline" for the same reason:
   it keeps the page, not only the map. */

// What one saved climb says about its map: "" when the whole map is on the device.
function mapNote(m) {
  if (!m.mapTiles) return "map not saved";
  if (m.mapMissing) return Math.round(100 * m.mapTiles / (m.mapTotal || 1)) + "% of the map";
  return "";
}

// The state of one route's save: undefined = still reading; null = not saved; else its packMeta row.
function useSavedRoute(routeId) {
  const [info, setInfo] = useState(undefined);
  const load = function () {
    return packMeta().then(function (all) {
      const m = all.find(function (x) { return x.id === routeId && !x.seed; });
      setInfo(m || null);
    }).catch(function () { setInfo(null); });
  };
  useEffect(function () { setInfo(undefined); load(); }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps -- load closes over routeId only
  return [info, load];
}

const plural = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };
// "12 photos · 2 topos · 8.4 MB": the images on the device for one climb; "" when there are none.
function mediaNote(m) {
  const parts = [];
  if (m.photos) parts.push(plural(m.photos, "photo"));
  if (m.topos) parts.push(plural(m.topos, "topo"));
  if (parts.length && m.mediaBytes) parts.push(m.mediaBytes >= 1048576 ? (m.mediaBytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(m.mediaBytes / 1024)) + " KB");
  return parts.join(" · ");
}
// What the save says about its images: how many landed, and never "saved" for ones that did not.
function mediaMessage(md) {
  if (!md || !(md.photosTotal + md.toposTotal)) return "";
  const got = md.photos + md.topos, all = md.photosTotal + md.toposTotal;
  if (md.full) return " This device is full: " + got + " of " + plural(all, "image") + " saved.";
  if (got < all) return " " + got + " of " + plural(all, "image") + " saved — tap Update with a better signal for the rest.";
  return " " + [md.photosTotal ? plural(md.photos, "photo") : "", md.toposTotal ? plural(md.topos, "topo") : ""].filter(Boolean).join(" and ") + " saved with it.";
}
// What to tell the climber once a save returns. The page is on the device in every branch.
function savedMessage(res) {
  const m = res && res.map, pics = mediaMessage(res && res.media);
  if (!m || !m.total) return "Saved on this device — this page opens with no signal. No map was saved for this climb." + pics;
  if (!m.ok) return (m.reason === "quota" ? "This page is saved, but the map didn’t fit on this device — free some space and tap Retry." : "This page is saved on this device. The map didn’t download — tap Retry with a better signal.") + pics;
  if (m.missing) return "Saved with " + Math.round(100 * m.saved / m.total) + tx("% of the map — tap Retry with a better signal for the rest.") + pics;
  return "Saved on this device — the way in and this page open with no signal." + pics;
}

const btn = { padding: "7px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer", minHeight: 36 };

/* `extra` rides in the same row, after the save controls — the desktop rail puts Draw approach there. */
/* `lead` is the route's Download GPX button: it comes first in this row, so the ways to take the map away sit side by side (owner, 2026-11-13). */
export function SaveMapOffline({ routeId, notify, lead, extra }) {
  const [info, reload] = useSavedRoute(routeId);
  const [busy, setBusy] = useState(false), [prog, setProg] = useState(null);
  const qc = useQueryClient();
  const say = function (m) { if (notify) notify(m); };
  const save = function () {
    if (busy) return;
    setBusy(true); setProg(null); warmLeafletOffline();
    packRouteWithSnapshot(routeId, { onMapProgress: setProg }).then(function (res) { say(savedMessage(res)); })
      .catch(function (e) { say("Couldn’t save this climb — " + ((e && e.message) || "check your connection")); })
      .finally(function () { setBusy(false); setProg(null); reload(); qc.invalidateQueries({ queryKey: ["pack-meta"] }); });
  };
  const remove = function () {
    unpackRouteOffline(routeId).then(function () { say("Removed from this device"); }, function () { say("Couldn’t remove it — it’s still on this device."); })
      .finally(function () { reload(); qc.invalidateQueries({ queryKey: ["pack-meta"] }); });
  };
  if (info === undefined) return lead || extra ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>{lead || null}{extra || null}</div> : null;
  const note = info ? mapNote(info) : "";
  // Beside Draw approach in the 300px desktop rail, both buttons have to fit one row.
  const saveBtn = extra ? { ...btn, padding: "7px 6px", fontSize: 12, whiteSpace: "nowrap", flex: "1 1 auto" } : btn;
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
    {lead || null}
    {busy ? <span role="status" style={{ fontSize: 12.5, color: C.textSub, fontWeight: 600 }}>{"Saving… " + (prog && prog.total ? Math.round(100 * prog.done / prog.total) + "%" : "")}</span>
      : info ? <>
        {/* In the 300px rail (`extra`) the status takes its own line: beside Remove and Draw approach it was squeezed to one word a line. */}
        <span style={{ fontSize: 12.5, color: note ? C.amber : C.green, fontWeight: 700, flex: extra ? "1 1 100%" : 1, minWidth: 0 }}>{note ? "Saved offline · " + note : "✓ Saved offline · " + savedAgo(info.updatedAt)}</span>
        {note ? <button onClick={save} aria-label="Retry saving the map" style={btn}>Retry</button> : null}
        <button onClick={remove} aria-label="Remove this saved climb from this device" style={{ ...btn, color: C.textSub }}>Remove</button>
      </>
      : <button onClick={save} style={saveBtn}>⤓ Save offline</button>}
    {extra || null}
  </div>;
}

/* Every climb saved on this device: open one, bring it up to date, or take it off. Drawn in Logbook ›
   Saved › Offline (`card`: the Saved view's heading above its box, and a line when there is nothing
   yet) and in Manage areas. Names come through useRoutesByIds, which falls back to the saved row
   itself with no signal. A row is removed by SWIPE (owner, 2026-11-05); on the website SwipeRow draws
   the same action as a button beside the row. The count is the rows that render. */
/** @param {{onOpen?: Function, notify?: Function, card?: boolean}} p — every field optional: a JS destructuring infers REQUIRED props, and Manage areas passes no `card`. */
export function SavedRouteMaps({ onOpen, notify, card }) {
  const metaQ = usePackMetaStrict();
  const qc = useQueryClient();
  const wide = useWideScreen();
  const [busyId, setBusyId] = useState(null);
  const metas = (metaQ.data || []).filter(function (m) { return !m.seed; });
  const rowsQ = useRoutesByIds(metas.map(function (m) { return m.id; }));
  const say = function (m) { if (notify) notify(m); };
  const head = function (n) { const t = "Saved offline" + (n ? " · " + n : ""); return card ? <MeH>{t}</MeH> : <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.label, marginBottom: 8 }}>{t}</div>; };
  const box = { background: C.surface, border: "1px solid " + C.border, borderRadius: 13, padding: "12px 13px", fontSize: 13, lineHeight: 1.5 };
  if (metaQ.isError) return card ? <section aria-label="Saved offline" style={{ marginBottom: 14 }}>{head(0)}<div style={{ ...box, color: C.amber }}>{"Couldn’t read what is saved on this device — this is not an empty list. Close and reopen the app and try again."}</div></section> : null;
  if (!metas.length) return card && !metaQ.isLoading ? <section aria-label="Saved offline" style={{ marginBottom: 14 }}>{head(0)}<div style={{ ...box, color: C.textMuted }}>{tx("Nothing saved offline yet — open a climb and tap")} <b style={{ color: C.amber }}>Save offline</b> under its map. The page then opens with no service.</div></section> : null;
  const byId = {}; (rowsQ.data || []).forEach(function (r) { byId[r.id] = r; });
  const done = function () { qc.invalidateQueries({ queryKey: ["pack-meta"] }); };
  const remove = function (id) {
    unpackRouteOffline(id).then(function () { say("Removed from this device"); }, function () { say("Couldn’t remove it — it’s still on this device."); }).finally(done);
  };
  const update = function (id) {
    if (busyId) return;
    setBusyId(id); warmLeafletOffline();
    packRouteWithSnapshot(id).then(function (res) { say(savedMessage(res)); }, function (e) { say("Couldn’t update this climb — " + ((e && e.message) || "check your connection") + ". The copy already saved is still here."); })
      .finally(function () { setBusyId(null); done(); });
  };
  return <section aria-label="Saved offline" style={card ? { marginBottom: 14 } : { marginTop: 18 }}>
    {head(metas.length)}
    {metas.map(function (m) {
      const r = byId[m.id];
      const name = r ? r.name : (rowsQ.isLoading ? "Loading…" : "A saved climb");
      const note = mapNote(m), busy = busyId === m.id, pics = mediaNote(m);
      const where = r ? [r.grade, r.areas && r.areas.name].filter(Boolean).join(" · ") : "";
      return <SwipeRow key={m.id} radius={12} action="remove" hover onDelete={function () { remove(m.id); }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: C.card, border: "1px solid " + C.border, borderRadius: 12 }}>
          <button onClick={function () { if (r && onOpen) onOpen(dbRouteToCamel(r)); }} disabled={!r} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: r ? "pointer" : "default", color: C.text }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{name}</div>
            {where ? <div style={{ fontSize: 11.5, color: C.textSub, overflowWrap: "anywhere" }}>{where}</div> : null}
            <div style={{ fontSize: 11.5, color: note ? C.amber : C.textMuted }}>{"Saved " + savedAgo(m.updatedAt) + (note ? " · " + note : " · with its map")}</div>
            {pics ? <div style={{ fontSize: 11.5, color: C.textMuted }}>{pics}</div> : null}
          </button>
          <button onClick={function () { update(m.id); }} disabled={!!busyId} aria-label={(busy ? "Updating " : "Update the saved copy of ") + name} style={{ ...btn, color: busyId && !busy ? C.textMuted : C.blue, flexShrink: 0 }}>{busy ? "Updating…" : "Update"}</button>
        </div>
      </SwipeRow>;
    })}
    {wide ? null : <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>Swipe a climb left to remove it from this device.</div>}
  </section>;
}

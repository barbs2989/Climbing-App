// THE CREW'S MEET-UP PIN (0478, owner 2026-11-19: "would there be a way to share a google or Apple Maps
// pin? Ie paste the shared link into the app?").
//
// The organiser pastes what a maps app's Share button hands out, or a bare coordinate, and the crew
// gets a point every member can open in Google Maps or Apple Maps. Only the COORDINATE is kept
// (crews.meet_lat / meet_lng): a shared link can carry tracking tokens, and from a coordinate we can
// build both apps' links for everyone.
//
// What a shared link looks like (checked 2026-11-19 against live links and Apple's "Adopting unified
// Maps URLs"):
//   Google short   https://maps.app.goo.gl/XXXX            no coordinate in it; it redirects to a full link
//   Google full    …/maps/place/<name or lat,lng>/@<view>/data=…!3d<lat>!4d<lng>
//                  !3d/!4d is the PLACE; the @lat,lng pair is only the centre of the map on screen, so it
//                  is used for a link with no place in it and never for a place link.
//                  …/maps/search/?api=1&query=lat,lng · …/maps?q=lat,lng · …/maps/dir/?…&destination=lat,lng
//   Apple short    https://maps.apple/p/XXXX               the host ends in "maps.apple" (no .com)
//   Apple full     https://maps.apple.com/place?coordinate=lat,lng&name=…
//                  https://maps.apple.com/?ll=lat,lng&q=…  (the older form) · /frame?center=lat,lng
//                  A link that carries only place-id or address has no coordinate to read.
// A short link is expanded by the resolve-map-link edge function (a browser cannot follow another
// site's redirect); the full link comes back here to be read. A link we cannot read is REFUSED with a
// reason: a guessed pin is worse than none.
import { navLinks } from "./navLinks.js";

const okPt = (la, ln) => Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const pt = (la, ln, name) => (okPt(la, ln) ? { kind: "pin", lat: r6(la), lng: r6(ln), name: cleanName(name) } : null);
function cleanName(s) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t && t.length <= 120 && !/^https?:/i.test(t) ? t : "";
}
function dec(s) { try { return decodeURIComponent(String(s).replace(/\+/g, " ")); } catch (_e) { return String(s); } }

/** "lat,lng" exactly, as a URL parameter carries it (an optional "loc:" prefix is Google's). */
function pairOf(v) {
  const m = /^\s*(?:loc:)?\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(String(v == null ? "" : v));
  if (!m) return null;
  const la = Number(m[1]), ln = Number(m[2]);
  return okPt(la, ln) ? [la, ln] : null;
}

/** A coordinate a climber typed or copied: "47.5201, -121.8203", "47.5201 -121.8203",
 *  "47.5201° N, 121.8203° W". At least one of the two numbers must carry a decimal, so "12, 30" in a
 *  sentence is not read as a place. Returns { kind: "pin", lat, lng, name: "" } or null. */
export function parseCoordPair(text) {
  const m = /^\s*\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*(?:,|;|\s)\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*\)?\s*$/i.exec(String(text == null ? "" : text));
  if (!m) return null;
  if (m[1].indexOf(".") < 0 && m[3].indexOf(".") < 0) return null;
  let la = Number(m[1]), ln = Number(m[3]);
  if (m[2] && m[2].toUpperCase() === "S") la = -Math.abs(la);
  if (m[4] && m[4].toUpperCase() === "W") ln = -Math.abs(ln);
  return pt(la, ln, "");
}

const isAppleShort = (h) => h === "maps.apple" || h.endsWith(".maps.apple");
const isGoogleShort = (h, p) => h === "maps.app.goo.gl" || (h === "goo.gl" && p.startsWith("/maps"));
const isGoogle = (h) => /^(?:www\.|maps\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(h);

/** Read a Google or Apple Maps link out of `text` (the share sheet often puts the place's name on the
 *  lines above the link). Returns:
 *    null                                 no maps link in the text
 *    { kind: "pin", lat, lng, name }      the place the link points at
 *    { kind: "short", url }               a short link: expand it (resolveMapLink), then read the result
 *    { kind: "unreadable" }               a maps link that carries no coordinate (a place id, an address) */
export function parseMapsLink(text) {
  const raw = String(text == null ? "" : text);
  const m = /https?:\/\/[^\s<>"']+/i.exec(raw);
  if (!m) return null;
  let u;
  try { u = new URL(m[0].replace(/[).,;]+$/, "")); } catch (_e) { return null; }
  const h = u.hostname.toLowerCase(), p = u.pathname || "/";
  const lead = cleanName(raw.slice(0, m.index).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0] || "");
  if (isAppleShort(h) || isGoogleShort(h, p)) return { kind: "short", url: u.href };
  const q = (k) => u.searchParams.get(k);

  if (h === "maps.apple.com") {
    const name = cleanName(q("name")) || (pairOf(q("q")) ? "" : cleanName(q("q"))) || cleanName(q("address")) || lead;
    const keys = ["coordinate", "ll", "q", "daddr", "destination"].concat(/^\/frame\/?$/.test(p) ? ["center"] : []);
    for (const k of keys) { const pr = pairOf(q(k)); if (pr) return pt(pr[0], pr[1], name); }
    return { kind: "unreadable" };
  }

  if (isGoogle(h) && (h.startsWith("maps.") || p.startsWith("/maps"))) {
    const href = dec(u.href);
    const seg = /\/maps\/(?:place|search)\/([^/@?]+)/.exec(dec(p));
    const segPair = seg ? pairOf(seg[1]) : null;
    const name = (seg && !segPair ? cleanName(seg[1]) : "") || lead;
    const d = /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(href);
    if (d) return pt(Number(d[1]), Number(d[2]), name) || { kind: "unreadable" };
    if (segPair) return pt(segPair[0], segPair[1], lead);
    for (const k of ["q", "query", "destination", "daddr", "ll", "center"]) { const pr = pairOf(q(k)); if (pr) return pt(pr[0], pr[1], lead); }
    // The centre of the map on screen: the shared thing only when the link names no place.
    if (!/\/maps\/place\//.test(p)) {
      const at = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(href);
      if (at) return pt(Number(at[1]), Number(at[2]), lead) || { kind: "unreadable" };
    }
    return { kind: "unreadable" };
  }
  return null;
}

/** What the pin box was given: a coordinate, a maps link, or neither ({ kind: "unreadable" }). */
export function parseMeetPin(text) {
  const t = String(text == null ? "" : text).trim();
  if (!t) return null;
  return parseCoordPair(t) || parseMapsLink(t) || { kind: "unreadable" };
}

/** True when `text` is a maps link (so the Meeting spot box can hand it to the pin instead of saving a URL as a name). */
export function isMapsLink(text) { return parseMapsLink(text) !== null; }

export const hasMeetPin = (crew) => !!crew && crew.meetLat != null && crew.meetLng != null && okPt(Number(crew.meetLat), Number(crew.meetLng));

/** "47.52010, -121.82030": five decimals, about a metre. */
export function meetPinText(lat, lng) { return Number(lat).toFixed(5) + ", " + Number(lng).toFixed(5); }

/** The two links every crew member gets, built from the coordinate (the formats lib/navLinks.js uses). */
export function meetPinLinks(lat, lng, name) {
  const la = Number(lat), ln = Number(lng);
  if (!okPt(la, ln)) return [];
  return navLinks({ lat: la, lng: ln, z: 16, pin: { lat: la, lng: ln } }, name || "Meet-up spot").filter((l) => l.n === "Google Maps" || l.n === "Apple Maps");
}

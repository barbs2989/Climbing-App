// Which OTHER grade scales the route page prints beside a route's own grade, remembered across reloads.
//
// The Composite Grade card used to print every conversion lib/grade.js gradeConversions() knows
// ("About 5c French · VI UIAA · 17 Ewbank") on every route page, to every climber. Owner,
// 2026-11-23: "don't show the French grade unless they have that in their settings." So each scale
// is a switch under Settings > Display, and every switch starts OFF: a climber who has not asked for
// a scale does not see it.
//
// DEVICE-scoped, like units and the date format (lib/units-pref.js says why): a display preference,
// works signed out, no migration, no read that can fail.
import { useSyncExternalStore } from "react";
import { defineFlagSet } from "./prefs.js";

/* Every scale gradeConversions() can return, spelled exactly as it labels them, and the ONLY keys
   read back out of storage. A scale the converter gains and this list lacks would never show. */
export const GRADE_SCALES = ["French", "UIAA", "Ewbank", "Font"];

/* Unset means HIDDEN — the owner's rule: a scale shows only once the climber turns it on. */
const pref = defineFlagSet("climbmatch-grade-scales", GRADE_SCALES, false);

/** @type {Record<string, boolean>} */
let snap = pref.load();
/** @type {Set<() => void>} */
const subs = new Set();

/** The stored switches, or all-off. Safe during SSR and in private mode.
 *  @returns {Record<string, boolean>} */
export const loadGradeScales = () => snap;

/** Turn one scale on or off, store it, and re-render every screen reading useGradeScales().
 *  @param {string} name  @param {boolean} on */
export function setGradeScale(name, on) {
  if (GRADE_SCALES.indexOf(name) < 0) return;
  snap = { ...snap, [name]: !!on };
  pref.save(snap);
  subs.forEach((f) => f());
}

/** @param {() => void} f */
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
/** @type {Record<string, boolean>} */
const SERVER = pref.load();
/** The switches as React state: a change in Settings reaches an open route page at once.
 *  @returns {Record<string, boolean>} */
export function useGradeScales() { return useSyncExternalStore(subscribe, loadGradeScales, () => SERVER); }

/** gradeConversions() output, keeping only the scales the climber has switched on.
 *  @param {string[][]} conv  @param {Record<string, boolean> | null | undefined} on
 *  @returns {string[][]} */
export function shownConversions(conv, on) { return conv.filter((x) => !!(on && on[x[0]])); }

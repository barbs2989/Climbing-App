// WHAT A PARTNER LISTING SAYS, READ THE SAME WAY BY EVERY SEARCH (owner note 2026-11-26: "when listing yourself and
// then selecting the dates and discipline does that last part actually work for when people are searching for you").
// A listing (partner_areas 0300, route_partner_listings 0489) carries the climbing types wanted there (empty = any) and
// ONE optional date window. Before this file the search read neither: its discipline filter read the climber's PROFILE,
// so a climber listed at Index for bouldering only was found by "Trad" and missed by "Bouldering" when bouldering was
// not on their profile; and nothing on the searching side asked about dates at all.
//
// Pure, so scripts/check-partner-listing-reach.mjs can exercise it with no DB and no browser.

// A window still running on `today` (local 'YYYY-MM-DD'), or null. The database sends a window until the day AFTER it
// ends (0548: its day is UTC's, so a window ending today vanished from about 4 pm Pacific); the screen drops it here, on
// the climber's own day. An ended window reads as no window: the listing stands, as the listing editor says.
export function liveWindow(from, to, today) {
  return from && to && String(to) >= today ? { from: String(from), to: String(to) } : null;
}

const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
// This weekend (weeksOut 0) or the next (1), as a Saturday-Sunday range; on a Sunday "this weekend" is today alone.
// The listing editor's presets (lib/MyPartnerAreas.jsx weekendFrom) are the same two weekends.
export function weekendRange(now, weeksOut) {
  const dow = now.getDay();
  const sat = addDays(now, dow === 0 ? -1 : 6 - dow);
  const s = addDays(sat, 7 * (weeksOut || 0));
  return { from: ymd(dow === 0 && !weeksOut ? now : s), to: ymd(addDays(s, 1)) };
}

// Does a climber's listing fit the days asked for? `listings` are the listings that MATCHED the search (the area or
// route searched), each { freeFrom, freeTo }. "fits": a window overlaps the range. "open": no window (any time, or an
// ended one) -- they may be free, the card says no dates. "clash": every window misses the range, so they said they
// are free on OTHER days, and the search leaves them out. No range asked: "open" for everyone.
export function windowFit(listings, range, today) {
  if (!range) return "open";
  let open = !listings || !listings.length, fit = false;
  for (const l of listings || []) {
    const w = liveWindow(l && l.freeFrom, l && l.freeTo, today);
    if (!w) { open = true; continue; }
    if (w.from <= range.to && w.to >= range.from) fit = true;
  }
  return fit ? "fits" : open ? "open" : "clash";
}

// Does a climber's listing say they climb `disc` there? The listing's own types decide; a listing that names none
// ("Any crag type") falls back to the climber's profile disciplines, as does a climber found with no listing at all
// (a shared objective, Everyone). `listings` as above, each { disciplines }; `profileDiscs` the profile's list.
export function discFits(listings, disc, profileDiscs) {
  if (!disc || disc === "All") return true;
  const prof = Array.isArray(profileDiscs) && profileDiscs.includes(disc);
  const ls = (listings || []).filter((l) => l && Array.isArray(l.disciplines));
  if (!ls.length) return prof;
  return ls.some((l) => l.disciplines.length ? l.disciplines.includes(disc) : prof);
}

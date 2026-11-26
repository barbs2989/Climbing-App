// THE PACE BANDS, in ONE place: the words the profile's speed card prints beside a pace
// (src/components/SpeedProfile.tsx) and the Speed section of the Partners filters
// (lib/PartnerSearch.jsx). Each is [key, label, from ft/hr (inclusive), to ft/hr (exclusive)].
// A pace of 0 is UNRECORDED and belongs to no band.
/** @type {Array<[string, string, number, number]>} */
export const PACE_BANDS = [
  ["fast", "Fast mover", 1400, Infinity],
  ["moderate", "Moderate pace", 1100, 1400],
  ["relaxed", "Relaxed pace", 800, 1100],
  ["building", "Building fitness", 1, 800],
];
/** @param {number} ftHr @returns {[string, string, number, number] | null} */
export const paceBandOf = (ftHr) => (ftHr > 0 ? PACE_BANDS.find((b) => ftHr >= b[2] && ftHr < b[3]) || null : null);

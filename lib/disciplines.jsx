// Minimal discipline color/icon lookup for the DB-backed map (NearMePanel).
// lib/DbAreaBrowser.jsx is lazy-loaded and deliberately never imports from
// ClimbMatch.jsx (see that file's header comment), so this duplicates just the
// handful of discipline glyphs/colors map pins need — not a full port of
// ClimbMatch.jsx's CAT/DiscIcon, which also cover trad/sport (a rock/style
// split the routes table doesn't track: DB rows only carry `discipline`, no
// `style` column, so "trad" vs "sport" isn't representable here).
import { renderToStaticMarkup } from "react-dom/server";

export const DISC_COLORS = {
  rock: "#2f81f7", scrambling: "#e3a008", alpine: "#56d4dd", mountaineering: "#f85149",
  hiking: "#b07d3a", bouldering: "#f0883e", ice: "#79c0ff", mixed: "#f778ba", aid: "#9aa4b2",
};
export const DISC_LABELS = {
  rock: "Rock", scrambling: "Scrambling", alpine: "Alpine", mountaineering: "Mountaineering",
  hiking: "Hiking", bouldering: "Bouldering", ice: "Ice", mixed: "Mixed", aid: "Aid",
};

function DiscGlyph({ d, size, color }) {
  const sz = size || 16, col = color || "#fff", dk = "rgba(0,0,0,0.42)";
  const G = {
    rock: <g><path fillRule="evenodd" d="M12 2C8.7 2 6 5 6 9V15C6 19 8.7 22 12 22C15.3 22 18 19 18 15V9C18 5 15.3 2 12 2ZM12 5C10 5 8.7 6.9 8.7 9V15C8.7 17.1 10 19 12 19C14 19 15.3 17.1 15.3 15V9C15.3 6.9 14 5 12 5Z" /><rect x="8.4" y="10.6" width="7.2" height="1.7" rx="0.8" /></g>,
    scrambling: <g><ellipse cx="12" cy="19" rx="6" ry="2.4" /><ellipse cx="12" cy="14.5" rx="4.6" ry="2.1" /><ellipse cx="12" cy="10.6" rx="3.3" ry="1.8" /><ellipse cx="12" cy="7.2" rx="2.2" ry="1.5" /></g>,
    alpine: <g><path d="M1 21L6 10L9 15L12 7L15 14L18 9L23 21Z" /></g>,
    mountaineering: <g><path d="M2 21L12 6L22 21Z" /><rect x="11.4" y="2.6" width="1.1" height="5" /><path d="M12.5 2.9L16.2 4.4L12.5 5.9Z" /></g>,
    hiking: <g><path d="M5.5 4.1C4 3.8 3.3 4.6 3.6 5.9C3.9 4.8 4.6 4.5 5.6 4.8Z" /><path fillRule="evenodd" d="M5.5 4H9.6C10 4 10.3 4.3 10.3 4.7L10.8 10.6C10.9 11.5 11.5 12.1 12.4 12.4L17.7 14.2C19.1 14.7 19.9 15.2 20.1 16.1H5.5ZM9.9 5.6A0.55 0.55 0 1 0 9.9 6.7A0.55 0.55 0 1 0 9.9 5.6ZM10.1 7.4A0.55 0.55 0 1 0 10.1 8.5A0.55 0.55 0 1 0 10.1 7.4ZM10.4 9.2A0.55 0.55 0 1 0 10.4 10.3A0.55 0.55 0 1 0 10.4 9.2Z" /><path d="M4.3 16.1H20.6C20.9 16.1 21.1 16.4 21 16.8L20.8 18C20.7 18.8 20 19.4 19.1 19.4H6C5 19.4 4.3 18.8 4.2 18L4 16.8C4 16.4 4 16.1 4.3 16.1Z" /></g>,
    bouldering: <g><path d="M3.5 18.8C3 14.8 4.6 11.6 7.2 10L11 7.6L16.2 8L20 11.4C21.6 14 21 17.6 19.4 18.9C16 20.1 7 20.1 3.5 18.8Z" /><path d="M11 7.8L9.6 13L14.4 13.8" fill="none" stroke={dk} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.2 8.2L14.4 13.8" fill="none" stroke={dk} strokeWidth="1.2" strokeLinecap="round" /></g>,
    ice: <g><rect x="11.2" y="6" width="1.8" height="13.5" rx="0.6" /><path d="M11.2 19.5L12.1 21.8L13 19.5Z" /><path d="M12.6 6C15.2 4.9 17.8 5.3 19.4 7.6C17.3 6.7 15.1 7.2 13.4 8.7Z" /><path d="M11.4 6H8.2V7.8H11.4Z" /></g>,
    mixed: <g><path d="M16.4 20.4C12 16 9 11 8.6 5.2L7 5.6C7.6 11.4 10.6 16.6 15 21Z" /><path d="M8.6 5.2C7 3.8 5 3.8 3.4 5.4C5 4.8 6.8 5 8 6.2Z" /><path d="M7.6 20.4C12 16 15 11 15.4 5.2L17 5.6C16.4 11.4 13.4 16.6 9 21Z" /><path d="M15.4 5.2C17 3.8 19 3.8 20.6 5.4C19 4.8 17.2 5 16 6.2Z" /></g>,
    aid: <g><rect x="8" y="3" width="1.8" height="18" rx="0.6" /><rect x="14.2" y="3" width="1.8" height="18" rx="0.6" /><rect x="9.2" y="6" width="5.6" height="1.7" /><rect x="9.2" y="11" width="5.6" height="1.7" /><rect x="9.2" y="16" width="5.6" height="1.7" /></g>,
  };
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={col} style={{ flexShrink: 0 }} aria-hidden="true">{G[d] || G.rock}</svg>;
}

const _cache = {};
export function discIconMarkup(d, size) {
  if (!d || !DISC_COLORS[d]) return null;
  const key = d + ":" + size;
  if (!_cache[key]) _cache[key] = renderToStaticMarkup(<DiscGlyph d={d} size={size} color="#fff" />);
  return _cache[key];
}

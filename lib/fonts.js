// THE APP'S TWO NAMED TYPEFACES, and the only place their stacks are spelled.
//
// Until 2026-11-23 the app drew everything in the system font at weight 700-800, which is half of
// why it read like every other generated app. Two faces now have one job each:
//
//   FONT_DISPLAY  Barlow Condensed. Names of places and screens: a route's name, a screen's title.
//                 Condensed suits long route names, but ONLY at 20px and above; smaller text stays
//                 in the body (system) font, where a condensed face gets hard to read.
//   FONT_MONO     IBM Plex Mono. Numbers a climber plans with: a grade, feet, miles. Fixed-width
//                 digits read like an altimeter and line up in a strip.
//
// The files are in public/fonts/ (self-hosted, so they work with no signal: public/sw.js precaches
// them) and are declared as @font-face in index.html. Each stack ends in fonts every device has, so
// a face that has not loaded, or a character it lacks (arrows, ticks, the degree sign), falls back
// per character instead of leaving a gap.
//
// This lives in lib/ and not in ClimbMatchCore.jsx because lib/ScreenHero.jsx and DbAreaBrowser do
// not import core.
export const FONT_DISPLAY = '"Barlow Condensed","Arial Narrow",system-ui,-apple-system,"Segoe UI",sans-serif';
export const FONT_MONO = '"IBM Plex Mono",ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace';

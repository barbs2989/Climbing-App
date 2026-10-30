// THE HEADLINE BOX at the top of a screen. Every main tab used to hand-inline its own copy, each
// titled for the TAB ("Logbook") while the sub-view under it changed -- so Logbook › Completed drew
// a SECOND box ("✓ My Ascents") mid-screen, and Climbs › Florida stacked Florida's box under a
// generic "Climbs" one. The rule now: ONE box per screen, at the top, titled for what you are
// looking at. A screen whose sub-view changes passes a different title; it does not add a box.
//
// It lives in lib/ rather than ClimbMatchCore.jsx so DbAreaBrowser, which does not import core,
// draws the same box (it used to keep its own copies of these two colours).
// The sign-in screen's look (#2687) carried into every header: a blue glow from the top centre
// fading into the page background (#0d1117 is C.bg, written out because DbAreaBrowser does not
// import core), and a soft blue shadow under the box. Was a flat 160deg navy gradient.
export const HERO_BG = "radial-gradient(130% 120% at 50% 0%, #10264a 0%, #0d1117 78%)";
// Home's banner wears the sign-in screen's own background, unchanged: Home is the screen you land
// on from it, so the hand-over keeps the same light.
export const HOME_GLOW = "radial-gradient(120% 100% at 50% 0%, #10264a 0%, #0d1117 70%)";
export const HERO_SHEEN = "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 26px -14px rgba(47,129,247,0.4)";

// `right` sits beside the title (a Save button); `children` run under the line (a count, a button).
// `quiet` (owner, 2026-10-25): the five top tabs (Climbs, Partners, Crew, Logbook, Ranks) lost the
// boxed headline -- the title sits in the sub-tab bar below it already, and the box took a third of a
// phone screen. Quiet keeps the title as a visually hidden <h1> (screen readers still get the screen's
// name), and keeps the one-line caption as plain muted text, with `right` beside it. Nothing else changes.
const SR_ONLY = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 };
/** @param {{ C: Record<string, string>, title?: import("react").ReactNode, sub?: import("react").ReactNode, right?: import("react").ReactNode, children?: import("react").ReactNode, mb?: number, quiet?: boolean }} props */
export function ScreenHero({ C, title, sub, right, children, mb = 14, quiet = false }) {
  if (quiet) return (
    <div style={{ position: "relative", marginBottom: mb }}>
      <h1 style={SR_ONLY}>{title}</h1>
      {sub || right ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{sub || null}</div>
          {right || null}
        </div>
      ) : null}
      {children || null}
    </div>
  );
  return (
    <div style={{ background: HERO_BG, boxShadow: HERO_SHEEN, borderRadius: 14, padding: 16, marginBottom: mb, border: "1px solid " + C.border }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.25, color: C.text, overflowWrap: "anywhere" }}>{title}</h1>
        {right || null}
      </div>
      {sub ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 4 }}>{sub}</div> : null}
      {children || null}
    </div>
  );
}

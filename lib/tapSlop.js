// A tap a few pixels off a small control still reaches it.
//
// Owner note (2026-10-28): "Some clicks links are small". A walk of all 100 screens the axe walk
// opens (scripts/probe-tap-targets.mjs) measured 1,051 distinct controls with a side under 44px:
// 62 under 24px (sign-in's "Terms of Service" and "Forgot password?" at 13-15px tall, the fire
// map's agency links at 18px, a climber's name at 18px), 469 at 24-31px (nearly every section
// toggle, chip and pill on the route page is 29px), 520 at 32-43px. Apple asks 44x44pt of every
// control, Material 48x48dp, WCAG 2.5.5 44px. Resizing a thousand controls would redraw every
// screen, so the TOUCH AREA grows instead and the drawing stays as it is -- Android's
// TouchDelegate and Material's own 48dp touch-target overlay do the same.
//
// How: a touch whose click lands on NOTHING tappable (a card's padding, the gap between two
// chips, the space under a link) goes to the nearest small control whose 44px box, centred on it,
// contains the touch. What it never does:
//   * steal a tap that hit a control -- a hit is always the hit;
//   * guess between two controls the same distance away -- the tap is left alone;
//   * reach a control another layer covers (a page control under an open sheet);
//   * act on a mouse or a keyboard -- a pointer is precise, and Enter/Space clicks carry detail 0;
//   * act inside a map, a chart or a text field, where a tap on "nothing" means something.
// A capture-phase listener on the document sees the click before React's root listener, so the
// stray tap reaches neither a backdrop's close handler nor anything else.

export const TAP_MIN = 44;
export const CONTROLS = 'a[href], button, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="option"], input[type="checkbox"], input[type="radio"], summary';
// A tap on "nothing" in these is a tap ON them: a map places a pin, a chart reads a point, a field takes the caret.
const OWN_TAPS = '.leaflet-container, canvas, svg, input, textarea, select, label, [contenteditable="true"], [data-tap-slop="off"]';

// Inside a control, or inside anything the app made tappable without a role (cursor: pointer).
function onTappable(el) {
  if (el.closest(CONTROLS) || el.closest(OWN_TAPS)) return true;
  for (let n = el; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).cursor === "pointer") return true;
  return false;
}

// The control a touch at (x, y) should reach, or null to leave the tap as it is.
export function slopTarget(x, y) {
  const hit = document.elementFromPoint(x, y);
  if (!hit || onTappable(hit)) return null;
  // EVERY control competes on distance, whatever its size: a touch 5px above a big Sign in button
  // and 10px below a small link is the button's (Chrome's own touch adjustment picks it too), so
  // it is left to the browser. Only a winner whose 44px box holds the touch is forwarded to.
  let best = null, bestD = Infinity, tie = false, bestReaches = false;
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest('[aria-hidden="true"], [inert]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const ex = Math.max(0, (TAP_MIN - r.width) / 2), ey = Math.max(0, (TAP_MIN - r.height) / 2);
    const reaches = x >= r.left - ex && x <= r.right + ex && y >= r.top - ey && y <= r.bottom + ey;
    const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    if (d > TAP_MIN / 2 || d > bestD + 0.5) continue;
    // Drawn on top where it sits: a control under an open sheet is not this tap's to reach.
    const cx = Math.min(Math.max(x, r.left + 1), r.right - 1), cy = Math.min(Math.max(y, r.top + 1), r.bottom - 1);
    const top = document.elementFromPoint(cx, cy);
    if (!top || (top !== el && !el.contains(top))) continue;
    if (d < bestD - 0.5) { best = el; bestD = d; tie = false; bestReaches = reaches; } else if (el !== best && !el.contains(best) && !best.contains(el)) tie = true;
  }
  return tie || !bestReaches ? null : best;
}

export function installTapSlop() {
  if (typeof document === "undefined") return;
  let touch = false;
  document.addEventListener("pointerdown", (e) => { touch = e.pointerType === "touch" || e.pointerType === "pen"; }, true);
  document.addEventListener("click", (e) => {
    if (!touch || e.detail === 0 || e.defaultPrevented) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const to = slopTarget(e.clientX, e.clientY);
    if (!to) return;
    e.preventDefault();
    e.stopPropagation();
    to.click();
  }, true);
  // The tap-target walk asks the same question the listener does, without tapping anything.
  if (import.meta.env && import.meta.env.DEV) window.__slopTarget = slopTarget;
}

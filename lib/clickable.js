// Give a hand-built control the three things a <button> provides for free.
//
// This app has no CSS framework, so controls are divs with inline styles. A <div onClick>
// is not in the tab order, does nothing on Enter or Space, and is announced as prose — so
// before this existed, opening a climb could not be done from a keyboard at all.
//
// Swapping those divs for real <button>s would be the better fix in a vacuum, but a button
// carries its own font, padding and box metrics, and this codebase positions everything by
// hand — see the note in CLAUDE.md about a <select> and a <button> not matching. Adding the
// semantics keeps the pixels identical.
//
//   <div {...clickable(() => openRoute(r))} style={row}>…</div>
//
// All three parts are load-bearing. role alone is worse than nothing: it announces a button
// that a keyboard still cannot reach.
//
// preventDefault on Space matters — Space scrolls the page by default, so without it the
// row activates AND the page jumps.
export const clickable = (onClick, opts = {}) => ({
  role: opts.role || "button",
  tabIndex: opts.disabled ? -1 : 0,
  onClick,
  onKeyDown: (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    // A nested control that has already handled this key press must win — otherwise the
    // row swallows Enter meant for the delete button inside it.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    onClick(e);
  },
});

// The loading screen React draws while it restores the session -- the SAME splash index.html paints
// while the bundle downloads (#cm-splash there, whose rules in index.html's <style> this reuses), so
// the hand-over from one to the other does not flash. Before this, App returned a blank dark page for
// those frames.
export default function BootSplash() {
  return (
    <div id="cm-splash" role="status" aria-label="Loading ClimbMatch" aria-busy="true">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#1a1916" stroke="#36322c" strokeWidth="0.4"/><g transform="translate(-1.44 -1.44) scale(0.42)" fill="none" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 50 L24 14 L33.5 33" stroke="#ff8a3d"/><path d="M33.5 33 L42.5 22 L54 50" stroke="#f1ede6"/><circle cx="33.5" cy="33" r="5.4" fill="#1a1916" stroke="none"/><circle cx="33.5" cy="33" r="3.3" stroke="#ff8a3d" strokeWidth="2.8"/></g></svg>
      <div className="s-word" aria-hidden="true">Climb<span>Match</span></div>
      <div className="s-tag" aria-hidden="true">Find partners. Climb more.</div>
      <div className="s-bar" aria-hidden="true"><i /></div>
    </div>
  );
}

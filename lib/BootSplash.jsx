// The loading screen React draws while it restores the session -- the SAME splash index.html paints
// while the bundle downloads (#cm-splash there, whose rules in index.html's <style> this reuses), so
// the hand-over from one to the other does not flash. Before this, App returned a blank dark page for
// those frames.
export default function BootSplash() {
  return (
    <div id="cm-splash" role="status" aria-label="Loading ClimbMatch" aria-busy="true">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#161b22" stroke="#30363d" strokeWidth="0.4"/><g transform="translate(2.4 2.4) scale(0.8)"><path d="m8 3 4 8 5-5 5 15H2L8 3z" fill="none" stroke="#2f81f7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g></svg>
      <div className="s-word" aria-hidden="true">Climb<span>Match</span></div>
      <div className="s-tag" aria-hidden="true">Find partners. Climb more.</div>
      <div className="s-bar" aria-hidden="true"><i /></div>
    </div>
  );
}

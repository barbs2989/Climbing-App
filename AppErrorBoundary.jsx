import { Component } from "react";

// The app had no error boundary, so any throw during render unmounted the whole tree and
// left the black `#root` — the exact blank screen `check:refs`, `check:hooks` and the
// index.html boot shell all exist to prevent. Those three stop specific *causes*; this
// stops the *consequence*, so an unanticipated throw costs one screen instead of the app.
//
// The audit's crash section is literally titled "Crashes (app blanks; no error boundary
// exists)" — every entry under it (string waypoint coords, conditional hooks, an
// unguarded `.includes` in a handler) blank-screened for want of this.
//
// Deliberately plain: no palette import. Pulling `C` in from ClimbMatchCore would drag the
// core module into the entry chunk and undo the startup-size work, so the few colours here
// are the same literals the boot shell in index.html already hardcodes.
//
// It says only what it knows. No "we've been notified" (nothing is), no invented error
// code. The message is shown because a climber standing at a trailhead needs to know
// whether to retry or give up, and the text is what they would paste into a bug report.
const WRAP = { minHeight: "100vh", background: "#0d1117", color: "#e6edf3", display: "flex",
  alignItems: "center", justifyContent: "center", padding: 24,
  font: "15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
const CARD = { maxWidth: 420, width: "100%", background: "#161b22", border: "1px solid #30363d",
  borderRadius: 14, padding: "20px 18px" };
const BTN = { width: "100%", marginTop: 16, padding: "12px 14px", borderRadius: 10, border: "none",
  background: "#2f81f7", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" };

export default class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    // Keep it in the console for anyone with devtools open; there is no reporting endpoint,
    // so claiming it was sent anywhere would be a lie.
    console.error("[ClimbMatch] render error:", err, info && info.componentStack);
  }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && this.state.err.message) || this.state.err);
    return (
      <div style={WRAP} role="alert">
        <div style={CARD}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>This screen hit a bug</div>
          <div style={{ fontSize: 13.5, color: "#99a3ad", lineHeight: 1.55 }}>
            Reloading usually clears it. Nothing you had saved to your account is affected — anything
            entered on this screen and not yet saved is lost.
          </div>
          <div style={{ marginTop: 12, padding: "9px 11px", background: "#0d1117", border: "1px solid #30363d",
            borderRadius: 9, fontSize: 12, color: "#99a3ad", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            wordBreak: "break-word", maxHeight: 120, overflowY: "auto" }}>{msg}</div>
          <button style={BTN} onClick={() => window.location.reload()}>Reload ClimbMatch</button>
        </div>
      </div>
    );
  }
}

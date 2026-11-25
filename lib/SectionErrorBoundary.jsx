import { Component } from "react";
import { SOLID_FILL } from "./buttonStyles.js";
import { C } from "../ClimbMatchCore.jsx";
import { swallowedChunk } from "./chunkReload.js";

// A section-level error boundary. AppErrorBoundary (main.jsx) is the last resort: any throw
// reaching it replaces the WHOLE app with a full-screen card. This one wraps a single section
// of the app (the active tab's content, the route page, the wide-layout page view) so a crash
// costs that section only. The header and the bottom navigation sit outside it, so the climber
// can always move to another tab, and switching tabs or routes remounts it (see the `key`s at
// the call sites in ClimbMatch.jsx), which clears the error without anyone pressing anything.
//
// Try Again clears the error and remounts the children. If the same render throws again, the
// fallback shows again: that is honest, and it costs nothing to try once more.
//
// A lazily-loaded section whose file could not be fetched gets one extra sentence. main.jsx
// has already reloaded once for a stale deploy by the time this shows, so the likely cause is
// the connection; the wording says so without claiming a cause it has not checked.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed/i;

export default class SectionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; this.retry = this.retry.bind(this); }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    // Console only: there is no reporting endpoint, so nothing here claims the error was sent anywhere.
    console.error("[ClimbMatch] section error (" + (this.props.name || "section") + "):", err, info && info.componentStack);
  }
  retry() { this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && this.state.err.message) || this.state.err);
    const chunk = CHUNK_ERROR.test(msg);
    // A deploy's missing file, mid-reload (lib/chunkReload.js): Try Again cannot help -- React.lazy keeps
    // the failed import -- so it says what happened and offers the reload main.jsx is already doing.
    const updated = swallowedChunk(msg);
    if (updated) return (
      <div role="alert" style={{ padding: "28px 16px", display: "flex", justifyContent: "center", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 420, width: "100%", boxSizing: "border-box", background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "22px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>ClimbMatch was just updated</div>
          <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.55 }}>This part of the app needs the new version. Reloading now; tap Reload if it doesn’t.</div>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10, border: "1px solid " + C.actionSolid, ...SOLID_FILL(C), color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
    return (
      <div role="alert" style={{ padding: "28px 16px", display: "flex", justifyContent: "center", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 420, width: "100%", boxSizing: "border-box", background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "22px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>Something went wrong loading this section</div>
          <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.55 }}>
            {chunk ? "This part of the app could not be downloaded, which usually means the connection dropped. " : ""}
            Try again. Anything you were typing here may be lost. The rest of the app still works, so you can pick another tab.
          </div>
          <button type="button" onClick={this.retry} style={{ marginTop: 16, width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10, border: "1px solid " + C.actionSolid, ...SOLID_FILL(C), color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Try Again</button>
        </div>
      </div>
    );
  }
}

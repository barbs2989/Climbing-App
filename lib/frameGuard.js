// CLICKJACKING (security audit 2026-11-26). Another site can load ClimbMatch inside an invisible
// <iframe> laid over its own buttons, so a climber who thinks they are tapping "Play" there is really
// tapping "Send request", "Join crew" or "Approve" here, signed in as themselves (on the Review desk,
// as the owner). The usual fix is a response header (X-Frame-Options / CSP frame-ancestors), and
// GitHub Pages can send neither; a <meta> CSP cannot carry frame-ancestors. So the page checks for
// itself, before React mounts: inside a frame owned by another site it draws no app at all, only a
// link that opens ClimbMatch in its own tab (OWASP's clickjacking cheat sheet, "legacy browser"
// defence). The same site framing itself is allowed; no such framing exists today.
export function framedByAnotherSite() {
  try {
    if (window.top === window.self) return false;
    // Reading a cross-origin parent's location throws; a same-origin parent answers.
    return window.top.location.origin !== window.location.origin;
  } catch (e) {
    return true;
  }
}

/** Replace the page with the "open it in its own tab" notice. Plain DOM: React has not mounted. */
export function showFramedNotice() {
  const root = document.getElementById("root") || document.body;
  const splash = document.getElementById("cm-splash");
  if (splash) splash.remove();
  root.textContent = "";
  const box = document.createElement("div");
  box.style.cssText = "font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f1ede6;background:#12110f;padding:24px;text-align:center;min-height:100vh;box-sizing:border-box";
  const p = document.createElement("p");
  p.textContent = "ClimbMatch can’t be used inside another website.";
  const a = document.createElement("a");
  a.href = window.location.href; a.target = "_top"; a.rel = "noopener";
  a.textContent = "Open ClimbMatch";
  a.style.cssText = "color:#8ab4ff;font-weight:700";
  box.appendChild(p); box.appendChild(a); root.appendChild(box);
}

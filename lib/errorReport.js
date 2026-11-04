// Send an error the app hit to our own database (app_errors, 0399), so a crash on a climber's phone
// is known to somebody other than that climber.
//
// Three sources call it: AppErrorBoundary (a throw while rendering), and the window "error" and
// "unhandledrejection" listeners installed by installErrorReporting() (a throw in an event handler
// or a timer, and a rejected promise nobody caught — neither ever reaches an error boundary).
//
// What it sends, and nothing more: the error's message and stack, React's component stack for a
// render error, the page PATH (never the query string or hash, which can carry ids and tokens), the
// build (the hashed entry-script name, which changes with every deploy), and the browser's user agent.
// The Privacy Policy says exactly this, under "What we collect".
//
// It must never make things worse. It never throws, it loads the database client lazily (so the
// entry chunk does not grow), it sends at most MAX_PER_SESSION reports and each distinct message
// once per page load, and it ignores what is not ours to fix: errors thrown by scripts from another
// origin (browser extensions, injected tools), a lazy screen whose file a deploy removed (main.jsx
// already reloads for that), and the browser's benign ResizeObserver notice.
const MAX_PER_SESSION = 10;
const sent = new Set();
let count = 0;

const IGNORE = /ResizeObserver loop|dynamically imported module|Importing a module script failed|error loading dynamically imported/i;

function buildId() {
  try {
    const s = document.querySelector('script[type="module"][src*="/assets/"]');
    return s ? s.getAttribute("src").split("/").pop() : "dev";
  } catch { return null; }
}

export function reportError(kind, err, componentStack) {
  try {
    const message = String((err && err.message) || err || "").trim();
    if (!message || IGNORE.test(message)) return;
    if (count >= MAX_PER_SESSION || sent.has(message)) return;
    sent.add(message);
    count++;
    const stack = err && typeof err.stack === "string" ? err.stack : null;
    const args = {
      p_kind: kind, p_message: message, p_stack: stack, p_component_stack: componentStack || null,
      p_path: window.location.pathname, p_build: buildId(), p_user_agent: navigator.userAgent,
    };
    import("./supabase.js").then(({ supabase, USE_DB }) => {
      if (!USE_DB || !supabase) return;
      return supabase.rpc("file_app_error", args);
    }).catch(() => { /* reporting is best effort; a failure here has nowhere useful to go */ });
  } catch { /* never let the reporter throw */ }
}

export function installErrorReporting() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    // A cross-origin script's error arrives as a bare "Script error." with no filename we own.
    if (e.filename && !e.filename.startsWith(window.location.origin)) return;
    if (!e.error && /^Script error\.?$/.test(e.message || "")) return;
    reportError("error", e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => reportError("rejection", e.reason));
}

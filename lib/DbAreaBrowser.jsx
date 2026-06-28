// Phase-0 proof: a self-contained area browser that drills the tree straight from
// Supabase (state -> region -> crag -> routes), proving fetch-on-demand end to end.
// Rendered only when USE_DB is on. Deliberately separate from the bundle browser so
// it can't regress the working app. Styling is minimal/inline (no dependency on C).
import { useState } from "react";
import { useAreaChildren, useAreaRoutes, useAreaTopContributors } from "./db";

const box = { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", color: "#e6edf3" };
const muted = { color: "#8b949e", fontSize: 12 };

function DbTopContributors({ areaId }) {
  const { data } = useAreaTopContributors(areaId, 3);
  if (!data || !data.length) return null;
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "#58a6ff", textTransform: "uppercase", marginBottom: 8 }}>Top Contributors</div>
      {data.map((c, i) => (
        <div key={c.contributor} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i ? 7 : 0 }}>
          <span style={{ width: 18, textAlign: "center" }}>{medal[i]}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.contributor}</span>
          {i === 0 ? <span style={{ fontSize: 10, fontWeight: 700, color: "#d29922", background: "rgba(210,153,34,0.15)", padding: "1px 7px", borderRadius: 8 }}>★ Top Contributor</span> : null}
          <span style={{ fontSize: 12, fontWeight: 700, color: "#8b949e" }}>{c.n}</span>
        </div>
      ))}
    </div>
  );
}

export default function DbAreaBrowser({ onOpenRoute }) {
  const [stack, setStack] = useState([]); // [{id,name}] drill path; [] = root
  const current = stack.length ? stack[stack.length - 1] : null;
  const { data: children, isLoading: lc, error: ec } = useAreaChildren(current?.id || null);
  const { data: routes, isLoading: lr, error: er } = useAreaRoutes(current?.id || null);

  const isLeaf = current && Array.isArray(children) && children.length === 0;
  const loading = lc || (current && lr);
  const error = ec || er;

  return (
    <div style={{ border: "1px solid #1f6feb", borderRadius: 14, padding: 12, marginBottom: 14, background: "rgba(31,111,235,0.06)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "#58a6ff", textTransform: "uppercase", marginBottom: 8 }}>
        ⚡ DB mode — areas served from Supabase
      </div>

      {/* breadcrumb */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10, fontSize: 13 }}>
        <button onClick={() => setStack([])} style={{ background: "none", border: "none", color: stack.length ? "#58a6ff" : "#e6edf3", fontWeight: 700, cursor: "pointer", padding: 0 }}>All areas</button>
        {stack.map((s, i) => (
          <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#6e7681" }}>›</span>
            <button onClick={() => setStack(stack.slice(0, i + 1))} style={{ background: "none", border: "none", color: i === stack.length - 1 ? "#e6edf3" : "#58a6ff", fontWeight: 700, cursor: "pointer", padding: 0 }}>{s.name}</button>
          </span>
        ))}
      </div>

      {loading && <div style={muted}>Loading…</div>}
      {error && <div style={{ color: "#f85149", fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div>}

      {/* child areas */}
      {!loading && !error && children && children.length > 0 && children.map((a) => (
        <div key={a.id} style={box} onClick={() => setStack([...stack, { id: a.id, name: a.name }])}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</span>
            <span style={{ color: "#58a6ff", fontSize: 12, fontWeight: 600 }}>{a.route_count} climb{a.route_count !== 1 ? "s" : ""} ›</span>
          </div>
          
        </div>
      ))}

      {/* routes (leaf crag) */}
      {!loading && !error && (isLeaf || (routes && routes.length > 0)) && (
        routes && routes.length > 0 ? routes.map((r) => (
          <div key={r.id} style={box} onClick={() => onOpenRoute && onOpenRoute(r)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</span>
              <span style={{ ...muted }}>{r.grade}</span>
            </div>
            <div style={{ ...muted, marginTop: 2 }}>{r.discipline}{r.sort_order != null ? " · #" + r.sort_order + " on the cliff" : ""}</div>
          </div>
        )) : <div style={muted}>No routes in this crag yet.</div>
      )}

      {current && <DbTopContributors areaId={current.id} />}
    </div>
  );
}

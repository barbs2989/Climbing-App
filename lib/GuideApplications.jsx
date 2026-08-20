// The reviewer's queue for guide applications — the reading half of 0021/0022, which went
// unbuilt for the whole life of the feature.
//
// A guide uploads a certificate of insurance and a certification card into a private bucket and
// is told "Application submitted — we'll review your credentials and follow up". Nothing listed
// applications, nothing retrieved the documents, and `getSignedDocUrl`/`deleteGuideDocument`
// were exported and called from nowhere. Same shape as the safety reports before 0158 — except
// there the RLS had to change too. Here the policies already allowed all of this; only a screen
// was missing.
//
// WHAT THIS SCREEN REFUSES TO DO, deliberately:
//   * it does not invent an expiry date for a credential (see reviewGuideCredential),
//   * it does not offer "List this guide" when the database would refuse it, and says why,
//   * it shows a document by TIME-LIMITED SIGNED URL and never renders it inline or caches it —
//     these are somebody's insurance and certification papers, not route photos.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGuideApplications, reviewGuideCredential, setGuideApplicationStatus, getSignedDocUrl } from "./db";
import { C } from "../ClimbMatchCore";
import { clickable } from "./clickable";

const AGO = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
};

const ATTESTATIONS = [
  ["insurance_attested", "Insurance"],
  ["permit_attested", "Permits"],
  ["waiver_process_attested", "Waivers"],
  ["independent_contractor_attested", "Contractor status"],
];

const DOC_LABEL = { insurance_coi: "Certificate of insurance", cert_card: "Certification card" };

function Chip({ tone, children }) {
  const map = {
    ok: [C.green, C.greenBg], warn: [C.amber, C.amberBg], bad: [C.red, C.redBg], mute: [C.textMuted, C.surface],
  };
  const [fg, bg] = map[tone] || map.mute;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: fg, background: bg, borderRadius: 7, padding: "2px 7px", whiteSpace: "nowrap" }}>{children}</span>;
}

function DocRow({ doc, notify }) {
  const [busy, setBusy] = useState(false);
  const open = () => {
    setBusy(true);
    getSignedDocUrl(doc.storage_path, 300)
      .then((url) => { if (url) window.open(url, "_blank", "noopener,noreferrer"); else notify && notify("That document could not be opened."); })
      .catch((e) => notify && notify("Couldn't open that document — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(false));
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid " + C.border }}>
      <span style={{ fontSize: 12.5, color: C.text, flex: 1, minWidth: 0 }}>{DOC_LABEL[doc.doc_type] || doc.doc_type}</span>
      {doc.deleted_at ? <Chip tone="mute">Withdrawn</Chip> : null}
      <button disabled={busy || !!doc.deleted_at} onClick={open}
        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: doc.deleted_at ? C.textMuted : C.blue, fontSize: 12, fontWeight: 700, cursor: doc.deleted_at ? "default" : "pointer" }}>
        {busy ? "Opening…" : "View"}
      </button>
    </div>
  );
}

function CredentialRow({ cred, notify, refresh }) {
  const [expires, setExpires] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState(null); // null | "verify" | "reject"
  const [busy, setBusy] = useState(false);
  const tone = cred.status === "verified" ? "ok" : cred.status === "rejected" ? "bad" : cred.status === "lapsed" ? "warn" : "mute";
  const name = cred.label || cred.cert_track || cred.cross_cutting_type || "Credential";

  const send = (status) => {
    setBusy(true);
    reviewGuideCredential(cred.id, { status, expiresAt: expires ? new Date(expires + "T12:00:00").toISOString() : null, reason })
      .then(() => { setMode(null); setReason(""); refresh(); notify && notify(status === "verified" ? "Credential verified" : "Credential rejected"); })
      .catch((e) => notify && notify((e && e.message) || "That didn't work — try again."))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ padding: "9px 0", borderTop: "1px solid " + C.border }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{name}</span>
        <span style={{ fontSize: 11.5, color: C.textMuted }}>{cred.kind === "primary_track" ? "Primary track" : "Additional"}</span>
        <Chip tone={tone}>{cred.status}</Chip>
        {cred.issuing_org ? <span style={{ fontSize: 11.5, color: C.textMuted }}>{cred.issuing_org}</span> : null}
        {cred.cert_number ? <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: "monospace" }}>{cred.cert_number}</span> : null}
      </div>
      {cred.rejected_reason ? <div style={{ fontSize: 12, color: C.red, marginTop: 3 }}>{cred.rejected_reason}</div> : null}

      {mode === "verify" ? (
        <div style={{ display: "flex", gap: 6, marginTop: 7, alignItems: "center", flexWrap: "wrap" }}>
          {/* Required, never defaulted — a guessed expiry either sidelines a valid guide or keeps
              an expired one listed, and neither is visible afterwards. */}
          <label style={{ fontSize: 11.5, color: C.textMuted }} htmlFor={"exp-" + cred.id}>Expires</label>
          <input id={"exp-" + cred.id} type="date" value={expires} onChange={(e) => setExpires(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 12.5, fontFamily: "inherit" }} />
          <button disabled={busy || !expires} onClick={() => send("verified")}
            style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + C.green + "55", background: C.greenBg, color: expires ? C.green : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: expires ? "pointer" : "default" }}>
            {busy ? "Working…" : "Confirm"}
          </button>
          <button onClick={() => setMode(null)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
        </div>
      ) : mode === "reject" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 7 }}>
          <textarea aria-label="Why this credential was rejected" value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="The guide sees this. Say what was wrong and what would fix it."
            style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={busy || !reason.trim()} onClick={() => send("rejected")}
              style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + C.red + "55", background: C.redBg, color: reason.trim() ? C.red : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: reason.trim() ? "pointer" : "default" }}>
              {busy ? "Working…" : "Confirm rejection"}
            </button>
            <button onClick={() => { setMode(null); setReason(""); }} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
          <button onClick={() => setMode("verify")} style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + C.green + "55", background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Verify</button>
          <button onClick={() => setMode("reject")} style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Reject</button>
        </div>
      )}
    </div>
  );
}

export function GuideApplicationQueue({ notify, onViewProfile }) {
  const { data, isLoading, error } = useGuideApplications();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["guide-applications"] }); qc.invalidateQueries({ queryKey: ["admin-queue-counts"] }); };

  // Three outcomes, three messages. "No applications" over a failed read is the false clean bill
  // this codebase has been bitten by more than once.
  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Loading applications…</div>;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load the queue — " + ((error && error.message) || "try again") + ". Do not read this as 'no applications'."}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No applications waiting.</div>;

  const setStatus = (g, status) => {
    setBusy(g.id);
    setGuideApplicationStatus(g.id, status, reason)
      .then(() => { setRejecting(null); setReason(""); refresh(); notify && notify(status === "active" ? "Listed in the guide directory" : "Application rejected"); })
      .catch((e) => notify && notify((e && e.message) || "That didn't work — try again."))
      .finally(() => setBusy(null));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((g) => {
        const missing = ATTESTATIONS.filter(([k]) => !g[k]);
        const creds = g.guide_credentials || [];
        const docs = (g.guide_documents || []).filter((d) => !d.deleted_at);
        const unreviewed = creds.filter((c) => c.status === "pending").length;
        const who = (g.profiles && g.profiles.name) || "A climber";
        return (
          <div key={g.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              {onViewProfile
                ? <span {...clickable(() => onViewProfile(g.id))} style={{ fontSize: 14, fontWeight: 700, color: C.blue, cursor: "pointer" }}>{who}</span>
                : <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{who}</span>}
              {g.title ? <span style={{ fontSize: 12, color: C.textSub }}>{g.title}</span> : null}
              <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: "auto" }}>{AGO(g.submitted_at)}</span>
            </div>
            {g.base_location ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{g.base_location}</div> : null}
            {g.insurance_carrier_name ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{"Insurer: " + g.insurance_carrier_name}</div> : null}

            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {ATTESTATIONS.map(([k, label]) => <Chip key={k} tone={g[k] ? "ok" : "bad"}>{(g[k] ? "✓ " : "✕ ") + label}</Chip>)}
            </div>

            {creds.length ? <div style={{ marginTop: 8 }}>{creds.map((c) => <CredentialRow key={c.id} cred={c} notify={notify} refresh={refresh} />)}</div>
              : <div style={{ fontSize: 12, color: C.amber, marginTop: 8 }}>No credentials submitted.</div>}

            {docs.length ? <div style={{ marginTop: 8 }}>{docs.map((d) => <DocRow key={d.id} doc={d} notify={notify} />)}</div>
              : <div style={{ fontSize: 12, color: C.amber, marginTop: 8 }}>No documents uploaded.</div>}

            {/* The database REFUSES status='active' without all four attestations
                (guide_profiles_active_requires_attestations). Saying so beats letting a raw
                constraint violation surface as "that didn't work". */}
            {missing.length ? (
              <div style={{ fontSize: 12, color: C.amber, marginTop: 9, lineHeight: 1.45 }}>
                {"Cannot be listed until the guide attests: " + missing.map(([, l]) => l).join(", ") + "."}
              </div>
            ) : unreviewed ? (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 9 }}>{unreviewed + (unreviewed === 1 ? " credential still needs" : " credentials still need") + " a decision."}</div>
            ) : null}

            {rejecting === g.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
                <textarea aria-label="Why this application was rejected" value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder="The guide sees this."
                  style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={busy === g.id || !reason.trim()} onClick={() => setStatus(g, "rejected")}
                    style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.red + "55", background: C.redBg, color: reason.trim() ? C.red : C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: reason.trim() ? "pointer" : "default" }}>
                    {busy === g.id ? "Working…" : "Confirm rejection"}
                  </button>
                  <button onClick={() => { setRejecting(null); setReason(""); }} style={{ padding: "7px 9px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                <button disabled={busy === g.id || missing.length > 0} onClick={() => setStatus(g, "active")}
                  style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + (missing.length ? C.border : C.green + "55"), background: missing.length ? C.surface : C.greenBg, color: missing.length ? C.textMuted : C.green, fontSize: 12.5, fontWeight: 700, cursor: missing.length ? "default" : "pointer" }}>
                  {busy === g.id ? "Working…" : "List this guide"}
                </button>
                <button disabled={busy === g.id} onClick={() => setRejecting(g.id)}
                  style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

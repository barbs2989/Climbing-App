// Real guide application/intake — replaces the old GuideApply's legal-agreement-only
// screen with an actual application: cert track + docs + mandatory attestations,
// all persisted to Supabase. Rendered only when USE_DB (see ClimbMatch.jsx's swap).
import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "./auth";
import {
  useCertTrackDisciplines, useGuideProfile, useGuideCredentials,
  submitGuideApplication, addGuideCredential, uploadGuideDocument,
  CERT_TRACK_LABELS, DISCIPLINE_LABELS,
} from "./db";

const CROSS_CUTTING = [["AIARE", "AIARE (avalanche)"], ["WFR", "WFR (Wilderness First Responder)"], ["other", "Other medical/safety cert"]];

const AGREEMENTS = [
  "I understand ClimbMatch is a directory connecting climbers with independent, self-employed guides — not a booking agent or employer — and that all information I submit must be accurate.",
  "I carry professional liability insurance and the carrier name I've entered above is real, not fabricated.",
  "I hold any land-management permits (NPS/USFS/state) and state licenses required for the areas where I guide.",
  "I maintain my own separate liability waiver/release process with clients, independent of any disclaimer shown by ClimbMatch.",
  "I am an independent contractor, not an employee or agent of ClimbMatch.",
];

export default function DbGuideApply({ onClose, notify, C, ActionIcon }) {
  const session = useSession();
  const uid = session && session.user && session.user.id;
  const { data: existing } = useGuideProfile(uid);
  const { data: certTrackRows } = useCertTrackDisciplines();
  const { data: existingCreds } = useGuideCredentials(uid);
  const tracks = Object.keys(CERT_TRACK_LABELS);

  const [title, setTitle] = useState("");
  const [baseLocation, setBaseLocation] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [dayRate, setDayRate] = useState("");
  const [groupMax, setGroupMax] = useState("2");
  const [regions, setRegions] = useState("");
  const [languages, setLanguages] = useState("English");

  const [certTrack, setCertTrack] = useState(tracks[0]);
  const [certNumber, setCertNumber] = useState("");
  const [issuingOrg, setIssuingOrg] = useState("AMGA");
  const [crossCutting, setCrossCutting] = useState([]);
  const [ccType, setCcType] = useState("AIARE");
  const [ccNumber, setCcNumber] = useState("");

  const [insuranceCarrierName, setInsuranceCarrierName] = useState("");
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [certCardFile, setCertCardFile] = useState(null);

  const [agree, setAgree] = useState(AGREEMENTS.map(() => false));
  const [sig, setSig] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addCrossCutting = () => {
    if (!ccNumber.trim()) return;
    setCrossCutting(c => [...c, { type: ccType, cert_number: ccNumber.trim() }]);
    setCcNumber("");
  };

  const ok = !!uid && title.trim() && baseLocation.trim() && bio.trim() && regions.trim() &&
    Number(dayRate) > 0 && certNumber.trim() && issuingOrg.trim() &&
    insuranceCarrierName.trim() && insuranceFile && certCardFile &&
    agree.every(Boolean) && sig.trim().length > 1;

  const today = new Date().toISOString();

  const submit = async () => {
    if (!ok || submitting) return;
    setSubmitting(true);
    try {
      const profile = await submitGuideApplication({
        id: uid, status: "submitted",
        title: title.trim(), base_location: baseLocation.trim(), specialty: specialty.trim(), bio: bio.trim(),
        cancellation_policy: cancellationPolicy.trim(),
        day_rate: Number(dayRate), group_max: Number(groupMax),
        regions: regions.split(",").map(s => s.trim()).filter(Boolean),
        languages: languages.split(",").map(s => s.trim()).filter(Boolean),
        insurance_carrier_name: insuranceCarrierName.trim(),
        insurance_attested: true, insurance_attested_at: today,
        permit_attested: true, permit_attested_at: today,
        waiver_process_attested: true, waiver_process_attested_at: today,
        independent_contractor_attested: true, independent_contractor_attested_at: today,
        agreement_signed_name: sig.trim(), agreement_signed_at: today,
        submitted_at: today,
      });
      const primaryCred = await addGuideCredential({
        guide_id: uid, kind: "primary_track", cert_track: certTrack,
        cert_number: certNumber.trim(), issuing_org: issuingOrg.trim(), status: "pending",
      });
      for (const cc of crossCutting) {
        await addGuideCredential({
          guide_id: uid, kind: "cross_cutting", cross_cutting_type: cc.type,
          cert_number: cc.cert_number, status: "pending",
        });
      }
      await uploadGuideDocument(uid, "insurance_coi", insuranceFile, primaryCred.id);
      await uploadGuideDocument(uid, "cert_card", certCardFile, primaryCred.id);
      notify && notify("Application submitted — we'll review your credentials and follow up.");
      onClose && onClose();
    } catch (e) {
      notify && notify("Something went wrong submitting your application: " + (e && e.message || "please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, boxSizing: "border-box" };
  const label = { fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 14, borderLeft: "3px solid " + C.blue, paddingLeft: 9 };
  const track = certTrackRows ? certTrackRows.filter(r => r.cert_track === certTrack).map(r => DISCIPLINE_LABELS[r.discipline] || r.discipline) : [];

  if (!session) {
    return createPortal((
      <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto", padding: 16 }}>
        <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
        <div style={{ marginTop: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>Sign in with a real account to apply as a guide — this application creates a legally-relevant, timestamped record tied to your identity.</div>
      </div>
    ), document.body);
  }

  if (existing && existing.status !== "draft" && existing.status !== "rejected") {
    return createPortal((
      <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto", padding: 16 }}>
        <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
        <div style={{ marginTop: 24, fontSize: 14.5, fontWeight: 700, color: C.text }}>{"Application status: " + existing.status}</div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
          {existing.status === "submitted" ? "We're reviewing your credentials — check back soon, or open your guide dashboard for details." : "Your listing is live."}
        </div>
        {existingCreds && existingCreds.length ? <div style={{ marginTop: 14 }}>
          {existingCreds.map(c => <div key={c.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px", marginBottom: 8, fontSize: 12.5, color: C.textSub }}>
            {(c.kind === "primary_track" ? CERT_TRACK_LABELS[c.cert_track] : c.cross_cutting_type) + " — " + c.status}
          </div>)}
        </div> : null}
      </div>
    ), document.body);
  }

  return createPortal((
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", zIndex: 2, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Apply to guide on ClimbMatch</div>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 16px 44px" }}>
        <div style={label}>Listing basics</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. AMGA Certified Rock Guide)" style={inp} />
        <input value={baseLocation} onChange={e => setBaseLocation(e.target.value)} placeholder="Base location (city, state)" style={{ ...inp, marginTop: 8 }} />
        <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Specialty (short line)" style={{ ...inp, marginTop: 8 }} />
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Bio" style={{ ...inp, marginTop: 8, resize: "vertical", fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={dayRate} onChange={e => setDayRate(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Day rate ($)" style={inp} />
          <select value={groupMax} onChange={e => setGroupMax(e.target.value)} style={{ ...inp, maxWidth: 180 }}>{["1", "2", "3", "4", "6"].map(n => <option key={n} value={n}>{"Up to " + n}</option>)}</select>
        </div>
        <input value={regions} onChange={e => setRegions(e.target.value)} placeholder="Regions (comma-separated)" style={{ ...inp, marginTop: 8 }} />
        <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="Languages (comma-separated)" style={{ ...inp, marginTop: 8 }} />
        <textarea value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} rows={3} placeholder="Cancellation policy (shown to clients)" style={{ ...inp, marginTop: 8, resize: "vertical", fontFamily: "inherit" }} />

        <div style={label}>Primary certification track</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>This determines exactly which disciplines you can be listed under — we cross-check it against AMGA/IFMGA's public directories before listing you.</div>
        <select value={certTrack} onChange={e => setCertTrack(e.target.value)} style={inp}>{tracks.map(t => <option key={t} value={t}>{CERT_TRACK_LABELS[t]}</option>)}</select>
        {track.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{track.map(d => <span key={d} style={{ fontSize: 11.5, fontWeight: 600, color: C.blue, background: C.blueBg, borderRadius: 20, padding: "3px 9px" }}>{d}</span>)}</div> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="Certification number" style={inp} />
          <input value={issuingOrg} onChange={e => setIssuingOrg(e.target.value)} placeholder="Issuing org" style={{ ...inp, maxWidth: 140 }} />
        </div>

        <div style={label}>Additional certifications (optional)</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Avalanche training, medical certs — these don't grant additional guiding disciplines.</div>
        {crossCutting.map((c, i) => <div key={i} style={{ fontSize: 12.5, color: C.textSub, marginBottom: 4 }}>{CROSS_CUTTING.find(x => x[0] === c.type)[1] + " — " + c.cert_number}</div>)}
        <div style={{ display: "flex", gap: 8 }}>
          <select value={ccType} onChange={e => setCcType(e.target.value)} style={inp}>{CROSS_CUTTING.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
          <input value={ccNumber} onChange={e => setCcNumber(e.target.value)} placeholder="Cert number" style={inp} />
          <button onClick={addCrossCutting} style={{ background: C.surface, border: "1px solid " + C.border, color: C.blue, borderRadius: 9, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>

        <div style={label}>Insurance</div>
        <input value={insuranceCarrierName} onChange={e => setInsuranceCarrierName(e.target.value)} placeholder="Insurance carrier name" style={inp} />
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Self-attested, not independently confirmed active — we do check the carrier name is a real, findable company.</div>
        <label style={{ display: "block", marginTop: 8, fontSize: 12.5, color: C.textSub }}>Certificate of insurance (photo)
          <input type="file" accept="image/*" onChange={e => setInsuranceFile(e.target.files[0] || null)} style={{ display: "block", marginTop: 4 }} />
        </label>
        <label style={{ display: "block", marginTop: 8, fontSize: 12.5, color: C.textSub }}>Certification card (photo)
          <input type="file" accept="image/*" onChange={e => setCertCardFile(e.target.files[0] || null)} style={{ display: "block", marginTop: 4 }} />
        </label>

        <div style={label}>Agreements</div>
        {AGREEMENTS.map((text, i) => (
          <div key={i} onClick={() => setAgree(a => a.map((v, k) => k === i ? !v : v))} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", cursor: "pointer" }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 5, border: "1px solid " + (agree[i] ? C.blue : C.border), background: agree[i] ? C.blue : "transparent", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{agree[i] ? "✓" : ""}</span>
            <span style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
        <div style={{ ...label, marginTop: 10 }}>Signature</div>
        <input value={sig} onChange={e => setSig(e.target.value)} placeholder="Type your full legal name" style={inp} />

        <button onClick={submit} disabled={!ok || submitting} style={{ width: "100%", marginTop: 18, background: ok ? C.blue : C.border, color: "#fff", border: "none", borderRadius: 11, padding: 13, fontSize: 14, fontWeight: 700, cursor: ok ? "pointer" : "default" }}>
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </div>
  ), document.body);
}

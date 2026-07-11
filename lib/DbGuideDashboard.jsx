// Real guide dashboard — replaces GuideDashboard's disconnected local seed state with
// actual reads/writes keyed off the signed-in guide's own row. No self-verify button:
// credential status only ever changes via admin review (Supabase Studio, Phase 1) or
// the 12-month reconciliation RPC. Rendered only when USE_DB (see ClimbMatch.jsx's swap).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "./auth";
import {
  useGuideProfile, useGuideCredentials, useGuideInquiries, useGuideReviews,
  updateGuideProfile, addGuideCredential, resubmitGuideCredential,
  updateInquiryStatus, postGuideReply, reconcileGuideVerification,
  isGuideVerified, CERT_TRACK_LABELS,
} from "./db";

const SECTIONS = [["credentials", "Credentials"], ["inquiries", "Inquiries"], ["reviews", "Reviews"], ["profile", "Profile"]];
const DAYS_TO_EXPIRY_WARNING = 60;

function daysUntil(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function DbGuideDashboard({ onClose, notify, C, ActionIcon }) {
  const session = useSession();
  const uid = session && session.user && session.user.id;
  const [section, setSection] = useState("credentials");
  useEffect(() => { if (uid) reconcileGuideVerification(uid).catch(() => {}); }, [uid]);

  const { data: profile, refetch: refetchProfile } = useGuideProfile(uid);
  const { data: credentials, refetch: refetchCreds } = useGuideCredentials(uid);
  const { data: inquiries, refetch: refetchInq } = useGuideInquiries(uid);
  const { data: reviews, refetch: refetchReviews } = useGuideReviews(uid);

  const [rate, setRate] = useState(""); const [groupMax, setGroupMax] = useState("2");
  const [bio, setBio] = useState(""); const [regions, setRegions] = useState(""); const [policy, setPolicy] = useState("");
  useEffect(() => {
    if (!profile) return;
    setRate(String(profile.day_rate || "")); setGroupMax(String(profile.group_max || "2"));
    setBio(profile.bio || ""); setRegions((profile.regions || []).join(", ")); setPolicy(profile.cancellation_policy || "");
  }, [profile]);

  const [adding, setAdding] = useState(false);
  const [nKind, setNKind] = useState("cross_cutting"); const [nTrack, setNTrack] = useState("SPI"); const [nCc, setNCc] = useState("AIARE");
  const [nNum, setNNum] = useState(""); const [nOrg, setNOrg] = useState("");
  const [replyId, setReplyId] = useState(null); const [replyText, setReplyText] = useState("");

  const card = { background: C.card, border: "1px solid " + C.border, borderRadius: 11, padding: "11px 13px", marginBottom: 9 };
  const inp = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, boxSizing: "border-box" };
  const stTag = st => st === "verified" ? { t: "✓ Verified", c: C.green, b: C.greenBg, d: C.greenDim } : st === "pending" ? { t: "In review", c: C.amber, b: C.amberBg, d: C.amber } : st === "lapsed" ? { t: "Lapsed — resubmit", c: C.amber, b: C.amberBg, d: C.amber } : { t: "Rejected — resubmit", c: C.red, b: C.redBg, d: C.red };

  const verified = isGuideVerified(credentials || []);
  const newInquiries = (inquiries || []).filter(x => x.status === "new").length;
  const upcoming = (inquiries || []).filter(x => x.status === "accepted").length;
  const avgRating = (reviews || []).length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const stats = [[String(upcoming), "Upcoming"], [avgRating + "★", "Rating"], [String(newInquiries), "New inquiries"]];

  const addCred = async () => {
    if (!nNum.trim()) return;
    try {
      await addGuideCredential(nKind === "primary_track"
        ? { guide_id: uid, kind: "primary_track", cert_track: nTrack, cert_number: nNum.trim(), issuing_org: nOrg.trim(), status: "pending" }
        : { guide_id: uid, kind: "cross_cutting", cross_cutting_type: nCc, cert_number: nNum.trim(), issuing_org: nOrg.trim(), status: "pending" });
      setNNum(""); setNOrg(""); setAdding(false);
      notify && notify("Credential submitted for verification.");
      refetchCreds();
    } catch (e) { notify && notify("Couldn't submit that credential."); }
  };
  const resubmit = async id => { await resubmitGuideCredential(id); refetchCreds(); notify && notify("Resubmitted for review."); };
  const setInqStatus = async (id, st) => { await updateInquiryStatus(id, st); refetchInq(); };
  const postReply = async id => { await postGuideReply(id, replyText); setReplyId(null); setReplyText(""); refetchReviews(); };
  const saveProfile = async () => {
    await updateGuideProfile(uid, { day_rate: Number(rate) || 0, group_max: Number(groupMax), bio, regions: regions.split(",").map(s => s.trim()).filter(Boolean), cancellation_policy: policy });
    notify && notify("Guide profile saved.");
    refetchProfile();
  };

  if (!session) {
    return createPortal(<div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, padding: 16 }}>
      <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
      <div style={{ marginTop: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>Sign in with a real account to view your guide dashboard.</div>
    </div>, document.body);
  }
  if (!profile) {
    return createPortal(<div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, padding: 16 }}>
      <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
      <div style={{ marginTop: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>You haven't applied to guide yet.</div>
    </div>, document.body);
  }

  return createPortal((
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Guide dashboard</div><div style={{ fontSize: 12, color: C.textSub }}>{"Status: " + profile.status + (newInquiries ? " · " + newInquiries + " new inquiries" : "")}</div></div>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{SECTIONS.map(x => { const on = section === x[0]; return <button key={x[0]} onClick={() => setSection(x[0])} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 16, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{x[1]}</button>; })}</div>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 16px 44px" }}>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 15px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{profile.title}</span>
            {verified ? <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green, background: C.greenBg, border: "1px solid " + C.greenDim, borderRadius: 6, padding: "2px 7px" }}>{"✓ Verified guide"}</span> : null}
          </div>
          <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 3 }}>{(profile.regions || []).join(", ")}</div>
          <div style={{ display: "flex", gap: 7, marginTop: 13 }}>{stats.map((st, i) => <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid " + C.border, borderRadius: 10, padding: "11px 6px", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{st[0]}</div><div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginTop: 3 }}>{st[1]}</div></div>)}</div>
        </div>

        {section === "credentials" && <div>
          <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 11 }}>Add the certifications and insurance you hold. We verify each one against the issuing body — nothing shows verified until we do. A verified primary-track credential expires 12 months after verification and must be resubmitted.</div>
          {(credentials || []).map(c => {
            const tg = stTag(c.status);
            const dLeft = c.status === "verified" ? daysUntil(c.verified_expires_at) : null;
            return <div key={c.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{c.kind === "primary_track" ? CERT_TRACK_LABELS[c.cert_track] : c.cross_cutting_type}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{"No. " + c.cert_number + (c.issuing_org ? " · " + c.issuing_org : "")}</div>
                  {dLeft != null && dLeft <= DAYS_TO_EXPIRY_WARNING ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 2 }}>{"Expires in " + dLeft + " days"}</div> : null}
                </div>
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: tg.c, background: tg.b, border: "1px solid " + tg.d, borderRadius: 6, padding: "2px 7px" }}>{tg.t}</span>
              </div>
              {c.status === "rejected" || c.status === "lapsed" ? <button onClick={() => resubmit(c.id)} style={{ marginTop: 8, background: C.surface, border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Resubmit for review</button> : null}
            </div>;
          })}
          {adding ? <div style={{ ...card, border: "1px solid " + C.blueDim }}>
            <select value={nKind} onChange={e => setNKind(e.target.value)} style={inp}><option value="primary_track">Primary certification track</option><option value="cross_cutting">Additional (avalanche/medical)</option></select>
            {nKind === "primary_track" ? <select value={nTrack} onChange={e => setNTrack(e.target.value)} style={{ ...inp, marginTop: 8 }}>{Object.keys(CERT_TRACK_LABELS).map(t => <option key={t} value={t}>{CERT_TRACK_LABELS[t]}</option>)}</select>
              : <select value={nCc} onChange={e => setNCc(e.target.value)} style={{ ...inp, marginTop: 8 }}><option value="AIARE">AIARE</option><option value="WFR">WFR</option><option value="other">Other</option></select>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}><input value={nNum} onChange={e => setNNum(e.target.value)} placeholder="Certificate no." style={inp} /><input value={nOrg} onChange={e => setNOrg(e.target.value)} placeholder="Issuing org" style={inp} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}><button onClick={addCred} style={{ flex: 1, background: C.blue, color: "#fff", border: "none", borderRadius: 9, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Submit for verification</button><button onClick={() => setAdding(false)} style={{ background: C.surface, border: "1px solid " + C.border, color: C.textSub, borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button></div>
          </div> : <button onClick={() => setAdding(true)} style={{ width: "100%", background: C.surface, border: "1px dashed " + C.border, color: C.blue, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add credential</button>}
        </div>}

        {section === "inquiries" && <div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 11 }}>Booking requests from climbers. Accept to hold the date, then agree on price and dates directly with them.</div>
          {(inquiries || []).length ? inquiries.map(q => <div key={q.id} style={card}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {q.profiles && q.profiles.avatar ? <img src={q.profiles.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} /> : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{q.objective || "Climbing inquiry"}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{(q.profiles && q.profiles.name || "Climber") + " · " + (q.requested_dates || "flexible") + " · " + q.party_size + (q.party_size > 1 ? " climbers" : " climber")}</div>
                {q.message ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4 }}>{q.message}</div> : null}
                {q.includes_minor ? <div style={{ fontSize: 11.5, fontWeight: 700, color: C.amber, background: C.amberBg, borderRadius: 6, padding: "2px 7px", display: "inline-block", marginTop: 4 }}>{"Trip includes a minor"}</div> : null}
              </div>
              {q.status !== "new" ? <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: q.status === "accepted" ? C.green : C.textMuted, background: q.status === "accepted" ? C.greenBg : C.surface, border: "1px solid " + (q.status === "accepted" ? C.greenDim : C.border), borderRadius: 6, padding: "2px 7px" }}>{q.status === "accepted" ? "Accepted" : "Declined"}</span> : null}
            </div>
            {q.status === "new" ? <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button onClick={() => setInqStatus(q.id, "accepted")} style={{ flex: 1, background: C.green, color: "#04110a", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Accept</button>
              <button onClick={() => setInqStatus(q.id, "declined")} style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, color: C.textSub, borderRadius: 8, padding: "7px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Decline</button>
            </div> : null}
          </div>) : <div style={{ fontSize: 12.5, color: C.textMuted }}>No inquiries yet.</div>}
        </div>}

        {section === "reviews" && <div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 11 }}>Reviews from climbers who actually sent you an inquiry. A reply shows publicly under the review.</div>
          {(reviews || []).length ? reviews.map(r => <div key={r.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{r.profiles && r.profiles.name || "Climber"}</span><span>{"★".repeat(r.rating)}</span></div>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{r.text}</div>
            {r.guide_reply ? <div style={{ marginTop: 8, background: C.surface, borderLeft: "2px solid " + C.blue, borderRadius: "0 8px 8px 0", padding: "7px 10px" }}><div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 2 }}>Your reply</div><div style={{ fontSize: 12.5, color: C.textSub }}>{r.guide_reply}</div></div>
              : replyId === r.id ? <div style={{ marginTop: 8 }}><textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Write a reply..." style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} /><div style={{ display: "flex", gap: 8, marginTop: 6 }}><button onClick={() => postReply(r.id)} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Post reply</button><button onClick={() => { setReplyId(null); setReplyText(""); }} style={{ background: C.surface, border: "1px solid " + C.border, color: C.textSub, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button></div></div>
                : <button onClick={() => { setReplyId(r.id); setReplyText(""); }} style={{ marginTop: 8, background: C.surface, border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "9px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Respond</button>}
          </div>) : <div style={{ fontSize: 12.5, color: C.textMuted }}>No reviews yet.</div>}
        </div>}

        {section === "profile" && <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Rate (per day) and party size</div>
          <div style={{ display: "flex", gap: 8 }}><input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, maxWidth: 150 }} /><select value={groupMax} onChange={e => setGroupMax(e.target.value)} style={{ ...inp, maxWidth: 180 }}>{["1", "2", "3", "4", "6"].map(n => <option key={n} value={n}>{"Up to " + n}</option>)}</select></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8, marginTop: 14 }}>Bio</div>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8, marginTop: 14 }}>Regions / areas</div>
          <input value={regions} onChange={e => setRegions(e.target.value)} style={inp} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8, marginTop: 14 }}>Cancellation and turnaround policy</div>
          <textarea value={policy} onChange={e => setPolicy(e.target.value)} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <button onClick={saveProfile} style={{ width: "100%", marginTop: 16, background: C.blue, color: "#fff", border: "none", borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save profile</button>
        </div>}
      </div>
    </div>
  ), document.body);
}

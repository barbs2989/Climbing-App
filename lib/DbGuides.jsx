// Real "Hire a Guide" browse/detail/inquiry screen — backed by Supabase. Mirrors the
// static Guides component's layout/copy but reads real listings, persists real
// inquiries (instead of discarding the form on submit), gates on a climber disclaimer
// + minor-in-party flag, and only lets a climber review a guide they actually have a
// real inquiry with. Rendered only when USE_DB (see ClimbMatch.jsx's swap).
import { useMemo, useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSession } from "./auth";
import {
  useGuides, useGuideCredentials, useGuideReviews, useMyInquiriesWithGuide,
  submitInquiry, submitReview,
  dbGuideToCamel, isGuideVerified, CERT_TRACK_LABELS, DISCIPLINE_LABELS,
} from "./db";

const DISCLAIMER_TEXT = "ClimbMatch is a directory connecting me with independent, self-employed guides. ClimbMatch is not a party to any guiding agreement, does not supervise or guarantee the guide's services, and assumes no liability for injury, loss, or damage arising from a guided trip.";

function Check({ checked, onClick, children, C }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", cursor: "pointer" }}>
      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 5, border: "1px solid " + (checked ? C.blue : C.border), background: checked ? C.blue : "transparent", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{checked ? "✓" : ""}</span>
      <span style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function GuideCard({ g, verified, onOpen, C }) {
  return (
    <div onClick={onOpen} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {g.avatar ? <img src={g.avatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{g.name}</span>
            {verified ? <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenBg, border: "1px solid " + C.greenDim, borderRadius: 6, padding: "1px 6px" }}>{"✓ Verified"}</span> : null}
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{"$" + g.rate + "/day"}</div>
          {g.rating != null ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{g.rating.toFixed(1) + "★ (" + g.reviewCount + ")"}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {g.disciplines.map(d => <span key={d} style={{ fontSize: 11, fontWeight: 600, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 8px" }}>{DISCIPLINE_LABELS[d] || d}</span>)}
      </div>
    </div>
  );
}

function GuideDetail({ guide, onClose, onDash, notify, C, ActionIcon }) {
  const session = useSession();
  const uid = session && session.user && session.user.id;
  const { data: credentials } = useGuideCredentials(guide.id);
  const { data: reviews } = useGuideReviews(guide.id);
  const { data: myInquiries } = useMyInquiriesWithGuide(uid, guide.id);
  const verified = isGuideVerified(credentials || []);

  const [obj, setObj] = useState(""); const [dates, setDates] = useState(""); const [party, setParty] = useState(1); const [msg, setMsg] = useState("");
  const [minor, setMinor] = useState(false); const [disclaimerOk, setDisclaimerOk] = useState(false);
  const [sent, setSent] = useState(false); const [sending, setSending] = useState(false);

  const [rating, setRating] = useState(5); const [reviewText, setReviewText] = useState(""); const [reviewSent, setReviewSent] = useState(false);
  const reviewableInquiry = (myInquiries || []).find(i => !i.reviews || !i.reviews.length);

  const send = async () => {
    if (!uid || !disclaimerOk || sending) return;
    setSending(true);
    try {
      await submitInquiry({
        guide_id: guide.id, climber_id: uid,
        objective: obj, requested_dates: dates, party_size: party, message: msg,
        includes_minor: minor,
      });
      setSent(true);
      notify && notify("Inquiry sent to " + guide.name.split(" ")[0] + " — they'll reply in the app.");
    } catch (e) {
      notify && notify("Couldn't send that inquiry — please try again.");
    } finally {
      setSending(false);
    }
  };

  const postReview = async () => {
    if (!reviewableInquiry) return;
    try {
      await submitReview({ inquiry_id: reviewableInquiry.id, guide_id: guide.id, climber_id: uid, rating, text: reviewText });
      setReviewSent(true);
      notify && notify("Review posted.");
    } catch (e) {
      notify && notify("Couldn't post that review.");
    }
  };

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, boxSizing: "border-box" };
  const label = { fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 14, borderLeft: "3px solid " + C.blue, paddingLeft: 9 };
  const primaryCred = (credentials || []).find(c => c.kind === "primary_track");

  return createPortal((
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1150, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", zIndex: 2 }}>
        <button onClick={onClose} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 16px 44px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {guide.avatar ? <img src={guide.avatar} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} /> : null}
          <div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{guide.name}</span>
              {verified ? <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenBg, border: "1px solid " + C.greenDim, borderRadius: 6, padding: "1px 6px" }}>{"✓ Verified"}</span> : null}
            </div>
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{guide.title + " · " + guide.base}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginTop: 12 }}>{guide.bio}</div>

        <div style={label}>Guide résumé</div>
        {[
          ["Primary certification", primaryCred ? CERT_TRACK_LABELS[primaryCred.cert_track] + " — " + primaryCred.status : "Not yet on file"],
          ["Disciplines listed", guide.disciplines.map(d => DISCIPLINE_LABELS[d] || d).join(", ") || "None yet"],
          ["Insurance", guide.insuranceCarrierName ? guide.insuranceCarrierName + " (self-attested, not independently confirmed)" : "Not on file"],
          ["Permits/licenses", guide.permitAttested ? "Attested by guide (not independently confirmed)" : "Not on file"],
          ["Rate", "$" + guide.rate + "/day, up to " + guide.groupMax + " climbers"],
          ["Cancellation policy", guide.cancellationPolicy || "Not specified"],
        ].map(row => (
          <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid " + C.border, fontSize: 12.5 }}>
            <span style={{ color: C.textMuted }}>{row[0]}</span><span style={{ color: C.text, fontWeight: 600, textAlign: "right" }}>{row[1]}</span>
          </div>
        ))}

        <div style={label}>Reviews</div>
        {(reviews || []).length ? reviews.map(r => (
          <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: C.text }}>
              <span>{r.profiles && r.profiles.name || "Climber"}</span><span>{"★".repeat(r.rating)}</span>
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{r.text}</div>
            {r.guide_reply ? <div style={{ marginTop: 8, background: C.surface, borderLeft: "2px solid " + C.blue, borderRadius: "0 8px 8px 0", padding: "7px 10px" }}>
              <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 2 }}>Guide's reply</div>
              <div style={{ fontSize: 12.5, color: C.textSub }}>{r.guide_reply}</div>
            </div> : null}
          </div>
        )) : <div style={{ fontSize: 12.5, color: C.textMuted }}>No reviews yet.</div>}

        {uid && reviewableInquiry && !reviewSent ? <div style={{ marginTop: 10, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>Leave a review</div>
          <select value={rating} onChange={e => setRating(Number(e.target.value))} style={inp}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n + " star" + (n === 1 ? "" : "s")}</option>)}</select>
          <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2} placeholder="How did it go?" style={{ ...inp, marginTop: 6, resize: "vertical", fontFamily: "inherit" }} />
          <button onClick={postReview} style={{ marginTop: 6, width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 9, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Post review</button>
        </div> : null}

        <div style={label}>Send an inquiry</div>
        {sent ? (
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>Sent — you'll agree on dates and price together before anything is booked. No payment now.</div>
        ) : (
          <>
            <textarea value={obj} onChange={e => setObj(e.target.value)} rows={2} placeholder="What's your objective?" style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
            <input value={dates} onChange={e => setDates(e.target.value)} placeholder="Dates you're thinking of" style={{ ...inp, marginTop: 8 }} />
            <select value={party} onChange={e => setParty(Number(e.target.value))} style={{ ...inp, marginTop: 8 }}>
              {Array.from({ length: guide.groupMax || 4 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n + (n > 1 ? " climbers" : " climber")}</option>)}
            </select>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} placeholder="Anything else the guide should know?" style={{ ...inp, marginTop: 8, resize: "vertical", fontFamily: "inherit" }} />
            <Check checked={minor} onClick={() => setMinor(m => !m)} C={C}>Our party includes a minor (under 18).</Check>
            {minor ? <div style={{ fontSize: 11.5, color: C.amber, background: C.amberBg, borderRadius: 8, padding: "7px 10px", marginBottom: 6 }}>Guardian consent requirements vary by state and by guide — confirm directly with the guide before booking.</div> : null}
            <Check checked={disclaimerOk} onClick={() => setDisclaimerOk(v => !v)} C={C}>{DISCLAIMER_TEXT}</Check>
            <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>No payment now. You'll confirm dates and price directly with the guide.</div>
            {!uid ? <div style={{ fontSize: 12.5, color: C.textSub }}>Sign in to send an inquiry.</div> :
              <button onClick={send} disabled={!disclaimerOk || sending} style={{ width: "100%", background: disclaimerOk ? C.blue : C.border, color: "#fff", border: "none", borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 700, cursor: disclaimerOk ? "pointer" : "default" }}>{sending ? "Sending…" : "Send inquiry"}</button>}
          </>
        )}
        <button onClick={() => { onClose(); onDash && onDash(); }} style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Already listed? Open your guide dashboard →</button>
      </div>
    </div>
  ), document.body);
}

export default function DbGuides({ onDash, notify, C, ActionIcon }) {
  const { data: rows } = useGuides();
  const [q, setQ] = useState(""); const [disc, setDisc] = useState(""); const [sort, setSort] = useState("rating");
  const [sel, setSel] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const guides = useMemo(() => {
    let list = (rows || []).map(g => ({ ...dbGuideToCamel(g), _verified: isGuideVerified(g.guide_credentials || []) }));
    if (q.trim()) { const s = q.trim().toLowerCase(); list = list.filter(g => g.name.toLowerCase().includes(s) || (g.title || "").toLowerCase().includes(s) || g.regions.some(r => r.toLowerCase().includes(s))); }
    if (disc) list = list.filter(g => g.disciplines.includes(disc));
    list = list.slice().sort((a, b) => sort === "price" ? a.rate - b.rate : (b.rating || 0) - (a.rating || 0));
    return list;
  }, [rows, q, disc, sort]);

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div style={{ padding: 14 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search guides, areas..." style={inp} />
      <div style={{ display: "flex", gap: 8, marginTop: 8, overflowX: "auto" }}>
        <select value={disc} onChange={e => setDisc(e.target.value)} style={{ ...inp, minWidth: 160 }}>
          <option value="">All disciplines</option>
          {Object.entries(DISCIPLINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inp, minWidth: 130 }}>
          <option value="rating">Top rated</option>
          <option value="price">Lowest price</option>
        </select>
      </div>
      <div style={{ marginTop: 12 }}>
        {guides.length ? guides.map(g => <GuideCard key={g.id} g={g} verified={g._verified} onOpen={() => setSel(g)} C={C} />) : <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "30px 0" }}>No guides listed yet.</div>}
      </div>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Are you a certified guide?</div>
        <button onClick={() => setApplyOpen(true)} style={{ background: C.surface, border: "1px solid " + C.border, color: C.blue, borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apply to guide</button>
        <div onClick={onDash} style={{ marginTop: 10, fontSize: 12, color: C.textMuted, cursor: "pointer" }}>Already listed? Open your guide dashboard →</div>
      </div>
      {sel ? <GuideDetail guide={sel} onClose={() => setSel(null)} onDash={onDash} notify={notify} C={C} ActionIcon={ActionIcon} /> : null}
      {applyOpen ? <DbGuideApplyLazy onClose={() => setApplyOpen(false)} notify={notify} C={C} ActionIcon={ActionIcon} /> : null}
    </div>
  );
}

const DbGuideApplyInner = lazy(() => import("./DbGuideApply"));
function DbGuideApplyLazy(props) {
  return <Suspense fallback={null}><DbGuideApplyInner {...props} /></Suspense>;
}

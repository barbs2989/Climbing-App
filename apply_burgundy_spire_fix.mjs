import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) { console.error("Set SUPABASE_SERVICE_KEY env var"); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: ws } });

const payload = {
  sling_rack: { "60cm": 10, "120cm": 2 },
  alpine_draws: 10,
  rope_type: "double (2x 60m) strongly preferred for rappel descent; single 60m usable with ~10ft of downclimbing after first rap, single 70m avoids that downclimb entirely",
  rope_length_m: 60,
  rope_note: "Standard practice is two 60m ropes carried together (one used for leading, both joined for double-rope rappels). The 5-rappel descent is staged for double-rope lengths (~40/55/55/40/60m per thepeakoftheweek.com's firsthand account). StephAbegg's trip report confirms a single 60m rope is a viable fallback (minor downclimbing required) and a single 70m eliminates that issue, but doubles remain the majority-recommended approach across all sources reviewed.",
  ascender: null,
  corrections: "Existing data is largely accurate and well-supported. (1) The what_to_bring field's 'rack to 3 inches' is inconsistent with the detailed_rack field's 'cams to 4 inches' — multiple independent sources (StephAbegg.com trip report, Mountain Project/LemkeClimbs beta) confirm cams to #4\" are the real standard, specifically needed to protect an offwidth section near the summit; the #4 can be forgone only by climbers very confident at 5.8. Recommend keeping/using the detailed_rack version. (2) The '5-rappel descent requiring doubles' claim is confirmed by 3 independent sources (thepeakoftheweek.com with specific rap-length breakdown, StephAbegg.com TR, and MP/LemkeClimbs beta) — verified, high confidence. (3) The '~10 alpine draws' figure traces to a single original source (an MP route comment, echoed verbatim by LemkeClimbs' aggregation) rather than fully independent corroboration — treat as verified-but-single-origin. (4) No source specifies sling sizes/counts separately from alpine draws or mentions any need for an ascender/jumar; sling_rack figures are inferred from standard alpine-tower rack practice, not directly sourced.",
  gear_confidence: "verified",
};

async function main() {
  const { data, error } = await supabase.from('routes').update(payload).eq('id', 'wa_burgundy_spire_north_face').select();
  if (error) {
    console.error('FAILED:', error.message);
    process.exit(1);
  }
  console.log('SUCCESS. Updated row:');
  console.log(JSON.stringify(data[0], null, 2));
}
main();

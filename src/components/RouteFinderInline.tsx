import { useState } from "react";
import { GRADE_SCALES, DISC_GRADE_SCALES } from "./RouteFinderPanel.tsx";
import type { RouteFinderPanelFilters } from "./RouteFinderPanel.tsx";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { BTN_LG } from "../../lib/buttonStyles.js";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

/** The climber's own grades as the profile holds them ("5.10a", "V4"); any may be unset. */
export interface RouteFinderInlineGrades { sport?: string | null; trad?: string | null; boulder?: string | null }
export interface RouteFinderInlineProps {
  /** Disciplines with climbs here that the finder can filter on, most climbs first; the first is picked. */
  discs: string[];
  /** Presets the top of the grade range to the climber's own grade for the picked discipline. */
  myGrades: RouteFinderInlineGrades | null;
  /** Opens the Route finder with these filters applied. */
  onFind: (filters: Partial<RouteFinderPanelFilters>) => void;
  C: typeof Palette;
}
interface Picked { disc: string; gLo: string; gHi: string; sortBy: string }
// Which of the climber's three profile grades presets which discipline's range. Top rope is climbed
// at the sport grade; the other disciplines have no grade on the profile, so they start at Any.
const MY_GRADE_KEY: Record<string, keyof RouteFinderInlineGrades> = { sport: "sport", trad: "trad", toprope: "sport", bouldering: "boulder" };
const SORTS: [string, string][] = [["lr", "Left → right"], ["name", "Name A→Z"], ["stars_desc", "Most starred"]];
const scaleFor = (disc: string) => (DISC_GRADE_SCALES[disc] || [])[0] || "";
const dl = DL as Record<string, string>;

/**
 * The Route finder's form, INLINE on the area page (competitor review item 15, 2026-11-04): Mountain
 * Project's area page puts the finder's fields beside the climb counts instead of a button. Type, a grade
 * range on that type's scale, and a sort; "Find climbs" opens the finder with exactly those filters. The
 * top of the range starts at the climber's own grade for the type when the profile holds one, so the
 * list opens at what they can climb. Website only; the phone keeps the Route finder button.
 */
export default function RouteFinderInline({ discs, myGrades, onFind, C }: RouteFinderInlineProps) {
  const init = (disc: string): Picked => {
    const sc = GRADE_SCALES[scaleFor(disc)] || [];
    const key = MY_GRADE_KEY[disc];
    const mine = key && myGrades ? myGrades[key] : null;
    return { disc, gLo: "", gHi: mine && sc.some(o => o[0] === mine) ? mine : "", sortBy: "lr" };
  };
  const [p, setP] = useState<Picked>(() => init(discs[0] || ""));
  const scale = scaleFor(p.disc);
  const opts = GRADE_SCALES[scale] || [];
  const iLo = p.gLo ? opts.findIndex(o => o[0] === p.gLo) : -1, iHi = p.gHi ? opts.findIndex(o => o[0] === p.gHi) : -1;
  const selSt = (on: boolean) => ({ padding: "9px 10px", borderRadius: 10, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.text, fontSize: 13.5, fontWeight: 700, minWidth: 0, width: "100%" });
  const lab = { display: "flex", flexDirection: "column" as const, gap: 5, fontSize: 11.5, color: C.textMuted, fontWeight: 700, minWidth: 0 };
  const presetNote = p.gHi && MY_GRADE_KEY[p.disc] && myGrades && myGrades[MY_GRADE_KEY[p.disc]] === p.gHi ? "Up to your " + (dl[p.disc] || p.disc).toLowerCase() + " grade" : null;
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Find climbs here</div>
        {presetNote ? <span style={{ fontSize: 11.5, color: C.textMuted }}>{presetNote}</span> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr 1.4fr auto", gap: 10, alignItems: "end" }}>
        <label style={lab}>Type
          <select aria-label="Type" value={p.disc} onChange={e => setP(init(e.target.value))} style={selSt(true)}>
            {discs.map(d => <option key={d} value={d}>{dl[d] || d}</option>)}
          </select>
        </label>
        <label style={lab}>From
          <select aria-label="From grade" value={p.gLo} onChange={e => setP(x => ({ ...x, gLo: e.target.value }))} disabled={!opts.length} style={selSt(!!p.gLo)}>
            <option value="">Any</option>
            {opts.map((o, i) => <option key={o[0]} value={o[0]} disabled={iHi >= 0 && i > iHi}>{o[0]}</option>)}
          </select>
        </label>
        <label style={lab}>To
          <select aria-label="To grade" value={p.gHi} onChange={e => setP(x => ({ ...x, gHi: e.target.value }))} disabled={!opts.length} style={selSt(!!p.gHi)}>
            <option value="">Any</option>
            {opts.map((o, i) => <option key={o[0]} value={o[0]} disabled={iLo >= 0 && i < iLo}>{o[0]}</option>)}
          </select>
        </label>
        <label style={lab}>Sort
          <select aria-label="Sort" value={p.sortBy} onChange={e => setP(x => ({ ...x, sortBy: e.target.value }))} style={selSt(false)}>
            {SORTS.map(s => <option key={s[0]} value={s[0]}>{s[1]}</option>)}
          </select>
        </label>
        <button onClick={() => onFind({ discs: p.disc ? [p.disc] : [], gSys: scale, gLo: p.gLo, gHi: p.gHi, sortBy: p.sortBy })} style={{ ...BTN_LG, border: "1px solid " + C.blue, background: C.blueBg, color: C.onSolid, whiteSpace: "nowrap" }}>Find climbs</button>
      </div>
    </div>
  );
}

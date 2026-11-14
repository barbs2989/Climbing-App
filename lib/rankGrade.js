// ONE difficulty scale for Ranks. A route's grade number is a number in its OWN system (5.12 is
// 12, V12 is 12, WI5 is 5), so weighing it raw scored a V12 like a 5.12 and every ice climb like
// a 5.5. Each system converts to a rock-equivalent first: 5.10a = 10.0, a letter grade = 0.25.
// The SAME tables are rank_grade() in supabase/migrations/0323 — the server ranks real climbers
// with that one; this one ranks the signed-out demo board. Keep the two equal.
const TABLES = {
  // index 0 is VB (-1)
  v: { off: 1, t: [9.5, 10, 10.75, 11.25, 11.75, 12.25, 12.5, 12.75, 13.25, 13.5, 13.75, 14, 14.25, 14.5, 14.75, 15, 15.25, 15.5, 15.75] },
  wi: { off: 0, t: [3, 5, 6, 7.5, 9, 10.25, 11.25, 12.25, 13] },
  m: { off: 0, t: [4, 6, 7, 8, 9, 10, 10.75, 11.5, 12.25, 12.75, 13.25, 13.75, 14.25, 14.75, 15.25] },
};

export function rankGrade(system, num) {
  if (num == null || isNaN(+num)) return 0;
  const n = +num;
  if (system === "yds") return Math.max(0, Math.min(20, n));
  const tb = TABLES[system];
  if (!tb) return 0;
  const x = Math.max(0, Math.min(tb.t.length - 1, n + tb.off));
  const i = Math.floor(x), f = x - i;
  return i + 1 >= tb.t.length ? tb.t[i] : tb.t[i] + (tb.t[i + 1] - tb.t[i]) * f;
}

// A top-rope or a follow scores one letter grade lower, as 8a.nu takes a grade step off a toprope.
export const styleGrade = (g, tick) => Math.max(0, g - (/^(top-rope|follow)$/i.test(tick || "") ? 0.25 : 0));

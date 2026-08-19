// Does a metric climber's number survive the trip to the column and back?
// The form canonicalises to ft/ft/ft/mi; 0143 then converts those to the stored columns.
// Both halves are replicated here from their real sources so the round trip is checked end
// to end rather than one leg at a time.
const uImp = (mode) => mode !== "metric";
const canonFt = (v, m) => { const n = parseFloat(v); return isFinite(n) ? (uImp(m) ? n : n * 3.28084) : null; };
const canonMi = (v, m) => { const n = parseFloat(v); return isFinite(n) ? (uImp(m) ? n : n / 1.60934) : null; };

// what 0143 stores, verbatim from the migration
const store = {
  length_m: (ft) => Math.round(ft * 0.3048),
  gain_ft:  (ft) => Math.round(ft),
  loss_ft:  (ft) => Math.round(ft),
  dist_km:  (mi) => Math.round(mi * 1.609344 * 1000) / 1000,
};

let bad = 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const t = (label, got, want, tol = 0.01) => {
  const ok = near(got, want, tol); if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(52)} ${got}${ok ? "" : `   expected ~${want}`}`);
};

console.log("IMPERIAL — the submitter types feet and miles, nothing should change");
t("600 ft height   -> length_m",  store.length_m(canonFt("600", "imperial")), 183, 1);
t("4100 ft gain    -> gain_ft",   store.gain_ft(canonFt("4100", "imperial")), 4100);
t("9.5 mi dist     -> dist_km",   store.dist_km(canonMi("9.5", "imperial")), 15.289, 0.002);

console.log("\nMETRIC — the number the climber typed must come back out of the column");
const h = store.length_m(canonFt("180", "metric"));
t("180 m height    -> length_m",  h, 180, 0.5);
const g = store.gain_ft(canonFt("1250", "metric"));
t("1250 m gain     -> gain_ft",   g, 4101, 1);
t("   ...and back  -> m",         g / 3.28084, 1250, 0.5);
const l = store.loss_ft(canonFt("900", "metric"));
t("900 m loss      -> loss_ft",   l, 2953, 1);
t("   ...and back  -> m",         l / 3.28084, 900, 0.5);
const d = store.dist_km(canonMi("15", "metric"));
t("15 km dist      -> dist_km",   d, 15, 0.002);

console.log("\nTHE BUG THIS PREVENTS — metric number taken as imperial");
const wrong = store.length_m(180);           // 180 treated as feet
t("180 m read as 180 ft would store",        wrong, 55, 1);
console.log(`        i.e. a 180 m route filed as ${wrong} m — off by ${(180/wrong).toFixed(2)}x`);

console.log("\nempty / junk must stay null, never 0");
for (const v of ["", null, "abc"]) {
  const a = canonFt(v, "metric"), b = canonMi(v, "imperial");
  const ok = a === null && b === null; if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${JSON.stringify(v)} -> ${a}, ${b}`);
}
console.log(`\n${bad ? bad + " FAILURE(S)" : "all round-trips hold"}`);
process.exit(bad ? 1 : 0);

// This script will generate the SQL UPDATE statements for watch_out population
// Shows the structure needed for importing hazard warnings

const example_ice_route_watch_out = {
  route_id: "early-winter-couloir",
  watch_out: [
    "Active avalanche path crossing (Phantom Slide approach) — check NWAC Snoqualmie Pass forecast, time crossing carefully",
    "Thin or absent ice most winters — be ready to dry-tool, condition-dependent climbing",
    "Loose chossy rock on pitch 2 and box gully — protection can be difficult",
    "No established rappel stations on descent — inspect any fixed anchors thoroughly, fatality recorded in 2025 from piton failure",
    "Cold northwest-facing aspect — expect winter temperatures even on clear days",
    "Avalanche patrol explosives nearby (Alpental) — stay clear of ski area boundary during control operations"
  ]
};

const example_alpine_route_watch_out = {
  route_id: "kautz-headwall",
  watch_out: [
    "Serac collapse hazard on Fuhrer Finger headwall (typically 10am-2pm exposure)",
    "High avalanche exposure >35° terrain throughout route (spring risk March-May)",
    "Crevasse field: mid-June through August — bergschrund crossing critical early season",
    "Rockfall significant below the headwall — move quickly through exposure",
    "Route-finding critical on descent in whiteout — carry map/GPS/compass",
    "High altitude (14,410 ft) — altitude sickness common on repeated attempts",
    "Mixed terrain transitions (snow/ice/rock) — crampon/axe removal/redonning required",
    "Summit wind exposure — 40+ knots common, expect summit conditions worse than forecast"
  ]
};

const example_mixed_route_watch_out = {
  route_id: "cathedral-peak-north-ridge",
  watch_out: [
    "Technical mixed climbing IV+/M5 — requires ice/rock tool proficiency",
    "Loose rock and poor protection on rock pitches — requires careful route-finding",
    "Crevasse hazard on approach glacier — microspikes/short rope",
    "Icefall hazard on East Buttress (potential retreat route) — check conditions before commit",
    "Exposure on summit tower — one-hand-off belay standard here",
    "Descent via rappels on snow/ice — anchor quality variable, inspect thoroughly",
    "High commitment — limited escape options once past pitch 3"
  ]
};

console.log("=== WATCH_OUT FIELD STRUCTURE ===\n");
console.log("Format: string[] array of hazard call-outs\n");
console.log("Example Ice Route:");
console.log(JSON.stringify(example_ice_route_watch_out, null, 2));
console.log("\n\nExample Alpine Route:");
console.log(JSON.stringify(example_alpine_route_watch_out, null, 2));
console.log("\n\nExample Mixed Route:");
console.log(JSON.stringify(example_mixed_route_watch_out, null, 2));

console.log("\n\n=== SQL UPDATE PATTERN ===");
console.log(`UPDATE routes SET watch_out = '["hazard1", "hazard2", ...]'::jsonb WHERE id = 'route-id';`);

process.exit(0);

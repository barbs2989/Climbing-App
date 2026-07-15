import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAK_ROUTES.json', 'utf-8'));

const areaMap = {
  'Mount Rainier': 'wa_mount_rainier',
  'Mount Adams': 'wa_mount_adams',
  'Mount Stuart': 'wa_mount_stuart'
};

const fixed = data.routes.map(r => {
  const base = {
    id: r.id,
    name: r.name,
    area_id: areaMap[r.mountain],
    lat: r.coordinates.lat,
    lng: r.coordinates.lng,
    high_point_ft: r.coordinates.elevation_ft,
    alpine_grade: r.grade.alpine_grade,
    rock_grade: r.grade.rock_grade,
    ice_grade: r.grade.ice_grade,
    discipline: r.discipline,
    description: r.route_beta.description,
    approach: r.approach.access_route,
    gain_ft: r.approach.approach_elevation_gain_ft,
    commitment: r.grade.commitment,
    watch_out: r.hazards ? r.hazards.map(h => h.hazard).join('; ') : null,
    fa: r.first_ascent?.description || null,
    best_season: r.seasonal_windows?.join(', ') || null
  };
  
  return base;
});

fs.writeFileSync(
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAKS_FIXED.json',
  JSON.stringify(fixed, null, 2)
);

console.log('Fixed routes for import:');
fixed.forEach(r => {
  console.log(`✓ ${r.id}: ${r.name} → ${r.area_id}`);
});

console.log(`\nReady to import to: MISSING_MAJOR_PEAKS_FIXED.json`);

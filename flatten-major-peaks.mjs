import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAK_ROUTES.json', 'utf-8'));

const flattened = data.routes.map(r => ({
  id: r.id,
  name: r.name,
  area_id: r.mountain === 'Mount Rainier' ? 'wa_rainier'
         : r.mountain === 'Mount Adams' ? 'wa_adams'
         : r.mountain === 'Mount Stuart' ? 'wa_stuart'
         : 'wa_' + r.mountain.toLowerCase().replace(/\s+/g, '_'),
  lat: r.coordinates.lat,
  lng: r.coordinates.lng,
  elevation_ft: r.coordinates.elevation_ft,
  grade: r.grade.alpine_grade,
  rock_grade: r.grade.rock_grade,
  ice_grade: r.grade.ice_grade,
  discipline: r.discipline,
  activity: r.discipline === 'alpine' ? 'Alpine climbing' : 'Ice climbing',
  description: r.route_beta.description,
  approach: r.approach.access_route,
  elevation_gain_ft: r.approach.approach_elevation_gain_ft,
  time_hours: r.approach.approach_time_hours,
  watch_out: r.hazards ? r.hazards.map(h => h.hazard).join('; ') : null
}));

console.log('Flattened routes:');
flattened.forEach(r => {
  console.log(`\n${r.id}:`);
  console.log(`  area_id: ${r.area_id}`);
  console.log(`  grade: ${r.grade}`);
  console.log(`  lat/lng: ${r.lat}, ${r.lng}`);
  console.log(`  elevation: ${r.elevation_ft} ft`);
});

// Write flattened JSON
fs.writeFileSync(
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAKS_FLATTENED.json',
  JSON.stringify(flattened, null, 2)
);

console.log(`\nFlattened to: MISSING_MAJOR_PEAKS_FLATTENED.json`);

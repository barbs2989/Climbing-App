#!/usr/bin/env node
// Is wa_up_in_arms a contaminated stub on an Okanogan crag, or a Concord Tower route filed on the
// wrong area? The discriminator CLAUDE.md records from wa_south_face_direct is the NON-PROSE
// columns: prose can be contaminated wholesale, so five prose fields agreeing is one claim counted
// five times. discipline, pitch count and grade are written by a different part of the pipeline.
import { selectAll } from "../lib/supabase-env.mjs";

const sibs = await selectAll("routes", "id,name,grade,discipline,pitches,area_id",
  "area_id=eq.wa_upper_wall", { pageSize: 200 });
console.log(`wa_upper_wall holds ${sibs.length} route(s):`);
for (const r of sibs) console.log(`   ${r.id.padEnd(30)} ${String(r.name).padEnd(26)} ${r.discipline}  ${r.grade}  ${r.pitches ?? "-"}p`);

const concord = await selectAll("routes", "id,name,grade,discipline,pitches",
  "area_id=eq.wa_concord_tower", { pageSize: 200 });
console.log(`\nwa_concord_tower holds ${concord.length} route(s):`);
for (const r of concord) console.log(`   ${r.id.padEnd(30)} ${String(r.name).padEnd(26)} ${r.discipline}  ${r.grade}  ${r.pitches ?? "-"}p`);

const dup = concord.find((r) => /up in arms/i.test(r.name || ""));
console.log(dup ? `\n** Concord Tower ALREADY holds "${dup.name}" (${dup.id}) — this would be a DUPLICATE, not a move.`
                : `\nConcord Tower holds no route named "Up In Arms" — nothing would be duplicated by a move.`);

// Do the Upper Wall siblings look like a different crag entirely?
const named = await selectAll("areas", "id,name,lat,lng,path,area_type", "id=in.(wa_upper_wall,wa_concord_tower)", { pageSize: 10 });
for (const a of named) console.log(`\n${a.id}: ${a.name} (${a.area_type}) ${a.lat},${a.lng}\n   ${a.path}`);

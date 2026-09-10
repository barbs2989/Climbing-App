#!/usr/bin/env node
// WHAT DO THE CI FIXTURE GROUPS' OWN group_members ROWS SAY?
//
// check:signed-in's `Group:detail` red has been triaged from source three times. The first
// controlled same-commit dump pair (2026-09-09) shows the failing roster reading `Member` on the
// OWNER row with no MOD badge, while `MEMBERS · 2` passed — so `moderatorIds` was empty AND
// `cl.ownerId` matched neither rendered id. Both derive from ONE query:
//
//   ownerId:       g.created_by
//   memberIds:     roster.filter(m => m.status === "active").map(m => m.user_id)
//   moderatorIds:  ...same active rows, filter(m => m.role !== "member")
//
// So `memberIds` having 2 while `moderatorIds` has 0 means the owner's own row carried
// role === "member". That is a claim about DATA, not about the reader, and this asks the rows.
//
// READ-ONLY. Service key, because group_members is RLS'd and an anon count returns 0 with a 200
// whatever the table holds — the trap CLAUDE.md records for exactly this kind of question.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

requireServiceKey();

const groups = await selectAll("groups", "id,name,created_by,created_at", "", { pageSize: 500 });
const ci = groups.filter((g) => /CI Fixture/i.test(g.name || ""));
console.log(`groups: ${groups.length} total, ${ci.length} CI fixture\n`);
if (!ci.length) { console.log("no CI fixture groups live right now — teardown is keeping up"); process.exit(0); }

const rows = await selectAll("group_members", "group_id,user_id,role,status", "", { pageSize: 1000 });
const byGroup = {};
for (const r of rows) (byGroup[r.group_id] = byGroup[r.group_id] || []).push(r);

let mismatched = 0;
for (const g of ci) {
  const roster = byGroup[g.id] || [];
  const active = roster.filter((m) => m.status === "active");
  const mods = active.filter((m) => m.role !== "member");
  const ownerRow = roster.find((m) => m.user_id === g.created_by);
  const ownerActive = !!ownerRow && ownerRow.status === "active";
  // THE EXACT PREDICATE THE SCREEN USES: the owner row is labelled "Owner" only when
  // cl.ownerId === that row's id, and the row is only THERE when it is active.
  const wouldLabelOwner = ownerActive && active.some((m) => m.user_id === g.created_by);
  if (!wouldLabelOwner || !mods.length) mismatched++;
  console.log(`${g.name}`);
  console.log(`  created ${g.created_at}  created_by=${String(g.created_by).slice(0, 8)}`);
  console.log(`  rows=${roster.length} active=${active.length} moderatorIds=${mods.length}`);
  console.log(`  owner row: ${ownerRow ? `role=${ownerRow.role} status=${ownerRow.status}` : "ABSENT"}`);
  console.log(`  -> roster would say "Owner": ${wouldLabelOwner ? "yes" : "NO — this is the failing shape"}`);
  for (const r of roster) console.log(`     ${String(r.user_id).slice(0, 8)}  role=${r.role}  status=${r.status}`);
  console.log("");
}
console.log(mismatched ? `${mismatched} of ${ci.length} CI group(s) are in the failing shape RIGHT NOW`
                       : `all ${ci.length} CI group(s) look healthy right now — the state is transient`);

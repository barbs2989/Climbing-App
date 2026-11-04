#!/usr/bin/env node
// Read-only census: does every stored profile photo (avatar + strip) still load for a stranger?
// Each URL is fetched with NO credentials, which is what another climber's <img> sends.
// Also counts accounts with no username (the Edit profile Save gate).
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const rows = await selectAll("profiles", "id,username,avatar,photos,created_at", "", { pageSize: 1000, key });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const noU = rows.filter((r) => !r.username || !r.username.trim());
const avatars = rows.filter((r) => r.avatar).map((r) => ({ id: r.id, kind: "avatar", url: r.avatar }));
const strip = rows.flatMap((r) => (r.photos || []).map((u) => ({ id: r.id, kind: "strip", url: u })));
console.log(`profiles ${rows.length} · no username ${noU.length} · avatars ${avatars.length} · strip photos ${strip.length}`);
const bad = [];
for (const p of [...avatars, ...strip]) {
  if (!/^https:\/\//.test(p.url)) { bad.push({ ...p, status: "not-https" }); continue; }
  const res = await fetch(p.url, { method: "GET" });
  const type = res.headers.get("content-type") || "";
  await res.arrayBuffer();
  if (res.status !== 200 || !/^image\//.test(type)) bad.push({ ...p, status: res.status + " " + type });
  await sleep(150);
}
console.log(`unloadable ${bad.length}`);
for (const b of bad) console.log(" ", b.kind, b.id.slice(0, 8), b.status, b.url.slice(0, 100));
const recent = noU.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)).slice(0, 5).map((r) => r.created_at.slice(0, 10));
console.log("newest no-username accounts:", recent.join(", "));

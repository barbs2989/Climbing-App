#!/usr/bin/env node
// ops:status — ONE answer to "is anything broken right now?", for the person looking after the live app.
//
// Why it exists (maintenance audit, 2026-11-26): the repo has eleven workflows and every failure
// emails the owner separately, so a red check arrives as one email among dozens and nothing says
// how LONG it has been red. Measured that day: render-guards had been red on main for three days
// (a fixture losing to the calendar), audit:silent-reverts on every merge for a day, the nightly
// offline files for three nights, check:counts for five — each fixed eventually, each found by
// somebody happening to look. And every Dependabot PR carried a red check unrelated to its
// dependency, so none was merged.
//
// What it reads (GitHub only — no database, no secrets beyond the gh login, so no DB gate):
//   1. every workflow's latest COMPLETED run on main, and since when it has been in that state;
//   2. how often each SCHEDULED workflow actually ran in the last 72 h against what its cron
//      promises (GitHub drops scheduled runs under load: deploy-drift's "every 30 min" ran 7 of
//      144 times in the 72 h before this was written);
//   3. open Dependabot PRs and their age;
//   4. open PRs older than 7 days (work that was started and is drifting from main).
//
//   npm run ops:status            print the report; exit 1 if anything on main is red
//   npm run ops:status -- --md    the same as Markdown
//   ... --issue [--dry]           keep ONE GitHub issue labelled ops-status in step with main: opened
//                                 (a notification) when something goes red, a comment (another
//                                 notification) only when the SET of red workflows changes, the body
//                                 refreshed silently otherwise, closed when everything is green.
//                                 .github/workflows/ops-status.yml runs this after every workflow on
//                                 main finishes. --dry prints what it would do and touches nothing.
//
// Crash reports from phones are a separate question with its own tool: npm run errors:read.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ISSUE = process.argv.includes("--issue");
const DRY = process.argv.includes("--dry");
const MD = ISSUE || process.argv.includes("--md");
const gh = (args) => JSON.parse(execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 << 20 }) || "null");
const now = Date.now();
const ago = (iso) => {
  const h = (now - Date.parse(iso)) / 3600000;
  return h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`;
};

// Expected runs per 72 h, read off each workflow's own cron lines (minute/hour fields only; the
// repo uses nothing finer). "*/30 * * * *" -> 144, "40 */6 * * *" -> 12... per day x3.
function cronRunsPer72h(expr) {
  const [min, hour] = expr.trim().split(/\s+/);
  const count = (f, span) => f === "*" ? span : f.startsWith("*/") ? Math.ceil(span / +f.slice(2)) : f.split(",").length;
  return count(min, 60) * count(hour, 24) * 3;
}

const WF_DIR = path.join(ROOT, ".github/workflows");
const workflows = readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f)).map((file) => {
  const text = readFileSync(path.join(WF_DIR, file), "utf8");
  const name = (/^name:\s*(.+)$/m.exec(text) || [, file])[1].trim().replace(/^["']|["']$/g, "");
  const crons = [...text.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  return { file, name, crons };
});

const rows = [];
const schedRows = [];
const since72 = new Date(now - 72 * 3600000).toISOString();
for (const w of workflows) {
  const runs = gh(["run", "list", "--workflow", w.file, "--branch", "main", "--limit", "60",
    "--json", "conclusion,status,createdAt,event,url"]) || [];
  const done = runs.filter((r) => r.status === "completed" && r.conclusion && !["cancelled", "skipped"].includes(r.conclusion));
  if (!done.length) { rows.push({ w, state: "PR-only", since: null, url: null }); continue; }
  const state = done[0].conclusion;
  let i = 0;
  while (i + 1 < done.length && done[i + 1].conclusion === state) i++;
  rows.push({ w, state, since: done[i].createdAt, url: done[0].url, capped: i + 1 === done.length });
  if (w.crons.length) {
    const expected = w.crons.reduce((s, c) => s + cronRunsPer72h(c), 0);
    const ran = runs.filter((r) => r.event === "schedule" && r.createdAt > since72).length;
    schedRows.push({ w, expected, ran });
  }
}

const dependabot = gh(["pr", "list", "--author", "app/dependabot", "--state", "open", "--json", "number,title,createdAt,url"]) || [];
const stale = (gh(["pr", "list", "--state", "open", "--limit", "200", "--json", "number,title,createdAt,author,isDraft"]) || [])
  .filter((p) => p.author?.login !== "dependabot" && p.author?.login !== "app/dependabot" && !/dependabot/i.test(p.author?.login || "")
    && now - Date.parse(p.createdAt) > 7 * 86400000);

const red = rows.filter((r) => r.state === "failure" || r.state === "timed_out" || r.state === "startup_failure");
const out = [];
const h = (t) => out.push(MD ? `\n### ${t}\n` : `\n== ${t}`);
const line = (t) => out.push(MD ? `- ${t}` : `  ${t}`);

out.push(MD ? `## Ops status — ${new Date(now).toISOString().slice(0, 16).replace("T", " ")} UTC` : `ops:status — ${new Date(now).toISOString()}`);
out.push(red.length ? `${MD ? "**" : ""}${red.length} workflow(s) RED on main.${MD ? "**" : ""}` : "Every workflow's latest run on main passed.");

h("Workflows on main (latest completed run)");
for (const r of [...red, ...rows.filter((x) => !red.includes(x))]) {
  const mark = red.includes(r) ? "RED  " : r.state === "success" ? "ok   " : `${r.state} `;
  const dur = r.since ? ` for ${r.capped ? "at least " : ""}${ago(r.since)}` : "";
  line(`${mark}${r.w.name}${dur}${red.includes(r) && r.url ? ` — ${MD ? `[last run](${r.url})` : r.url}` : ""}`);
}

h("Scheduled checks: runs in the last 72 h vs what the cron promises");
for (const s of schedRows) {
  const pct = s.expected ? Math.round((100 * s.ran) / s.expected) : 0;
  line(`${s.w.name}: ${s.ran} of ${s.expected}${pct < 50 ? ` (${pct}% — GitHub dropped the rest; do not rely on this one for fast alerts)` : ""}`);
}

h(`Dependabot PRs open: ${dependabot.length}`);
for (const p of dependabot) line(`#${p.number} (${ago(p.createdAt)} old) ${p.title}`);

h(`Other PRs open more than 7 days: ${stale.length}`);
for (const p of stale.slice(0, 20)) line(`#${p.number} (${ago(p.createdAt)} old)${p.isDraft ? " [draft]" : ""} ${p.title}`);

h("Not covered here");
line("Crashes on climbers' phones: `npm run errors:read` (needs the service key; groups app_errors and names file:line).");
line("Database health and Disk IO budget: the Supabase dashboard (Reports > Database).");

const report = out.join("\n");
if (!ISSUE) { console.log(report); process.exit(red.length ? 1 : 0); }

// --- the one issue ---
const LABEL = "ops-status";
const redKey = red.map((r) => r.w.file).sort().join(",");
const body = `${report}\n\n<!-- ops-red: ${redKey} -->\n_Kept up to date by the Ops status workflow (scripts/ops-status.mjs). Closes itself when main is green._`;
const act = (args, what) => { console.log(`${DRY ? "[dry] would " : ""}${what}`); if (!DRY) execFileSync("gh", args, { stdio: "inherit" }); };
const issues = gh(["issue", "list", "--label", LABEL, "--state", "all", "--limit", "1", "--json", "number,state,body"]) || [];
const cur = issues[0];
const prevKey = cur ? ((/<!-- ops-red: ([^>]*?) -->/.exec(cur.body || "") || [, ""])[1]).trim() : "";
const bodyFile = path.join(process.env.RUNNER_TEMP || process.env.TMPDIR || "/tmp", "ops-status-body.md");
if (!DRY) writeFileSync(bodyFile, body);
if (red.length) {
  if (!cur) {
    if (!DRY) { try { execFileSync("gh", ["label", "create", LABEL, "--color", "B60205", "--description", "Something on main is red", "--force"], { stdio: "ignore" }); } catch { /* exists, or no permission: issue create reports a real failure */ } }
    act(["issue", "create", "--title", "Ops status: something on main is red", "--label", LABEL, "--body-file", bodyFile], "open the ops-status issue");
  } else {
    if (cur.state !== "OPEN") act(["issue", "reopen", String(cur.number)], `reopen #${cur.number}`);
    act(["issue", "edit", String(cur.number), "--body-file", bodyFile], `refresh #${cur.number}'s body`);
    if (cur.state !== "OPEN" || prevKey !== redKey) act(["issue", "comment", String(cur.number), "--body", `Now red on main: ${red.map((r) => `**${r.w.name}**`).join(", ")}.`], `comment on #${cur.number} (the red set changed)`);
  }
} else if (cur && cur.state === "OPEN") {
  act(["issue", "edit", String(cur.number), "--body-file", bodyFile], `refresh #${cur.number}'s body`);
  act(["issue", "close", String(cur.number), "--comment", "Every workflow's latest run on main passed."], `close #${cur.number}`);
} else {
  console.log("main is green and no ops-status issue is open: nothing to do.");
}

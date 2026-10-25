#!/usr/bin/env node
// check:no-secrets — no tracked or untracked source file may hold a Supabase credential or the
// project's own URL as a LITERAL. Credentials belong in .env (service key) and .env.local (the
// public anon key and URL), read through process.env / import.meta.env.
//
// Why this exists: the repo is PUBLIC on GitHub. A service_role key was committed in a checklist
// doc and as a `process.env.SUPABASE_SERVICE_KEY || '<key>'` fallback in enrichment scripts, and
// it stayed in history after the working tree was cleaned. The tree itself was then clean for
// months, so nothing flagged the next paste. This guard checks the tree on every build.
//
// Rules:
//   1. A `sb_secret_` key, anywhere (docs included). The secret key is never written down.
//   2. A JWT whose payload says `role: service_role`, anywhere.
//   3. In code, a literal anon JWT or `sb_publishable_` key. Public, but it still belongs in env:
//      the next person copies the file, and a key pinned to a file cannot be rotated in one place.
//   4. In code, a literal `<project-ref>.supabase.co` host. The URL is config, not source.
//
// Docs (*.md, docs/) are exempt from rules 3 and 4: they describe the setup, and the public key
// may appear in an archived note. Rules 1 and 2 cover them too.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_EXTS = /\.(jsx?|mjs|cjs|tsx?|json|html|sql|ya?ml|sh)$/;
const ANY_EXTS = /\.(jsx?|mjs|cjs|tsx?|json|html|sql|ya?ml|sh|md|txt|env\.example)$/;

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => f && ANY_EXTS.test(f));

// Fails CLOSED: "nothing found" is also what a broken walk prints.
if (files.length < 500) {
  console.error(`check:no-secrets FAILED — only ${files.length} file(s) found; a broken walk, not a small repo.`);
  process.exit(1);
}

const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{10,}/;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g;
const LITERAL_PUB = /sb_publishable_[A-Za-z0-9_-]{10,}/;
const PROJECT_HOST = /\b[a-z]{20}\.supabase\.co\b/;

function jwtRole(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(part, "base64").toString("utf8"));
    return json.role || null;
  } catch { return null; }
}

const hits = [];
for (const f of files) {
  let text;
  try { text = readFileSync(ROOT + f, "utf8"); } catch { continue; }   // deleted between ls-files and here
  const isDoc = /\.(md|txt)$/.test(f) || f.startsWith("docs/");
  const lines = text.split("\n");
  lines.forEach((src, i) => {
    const line = i + 1;
    if (SECRET_KEY.test(src)) hits.push({ f, line, why: "secret key (sb_secret_) written out" });
    for (const m of src.matchAll(JWT)) {
      const role = jwtRole(m[0]);
      if (role === "service_role") hits.push({ f, line, why: "service_role JWT written out" });
      else if (!isDoc) hits.push({ f, line, why: `literal ${role || "unknown"} JWT in code` });
    }
    if (!isDoc && LITERAL_PUB.test(src)) hits.push({ f, line, why: "literal sb_publishable_ key in code" });
    if (!isDoc && SRC_EXTS.test(f) && PROJECT_HOST.test(src)) hits.push({ f, line, why: "literal Supabase project host in code" });
  });
}

if (hits.length) {
  console.error(`check:no-secrets FAILED — ${hits.length} place(s) hold a Supabase credential or project URL as a literal:`);
  for (const h of hits.slice(0, 40)) console.error(`  ${h.f}:${h.line}  ${h.why}`);
  if (hits.length > 40) console.error(`  … and ${hits.length - 40} more`);
  console.error("Move it to .env (service key) or .env.local (anon key, URL) and read process.env / import.meta.env. See .env.example.");
  process.exit(1);
}
console.log(`check:no-secrets OK — ${files.length} files, no Supabase credential or project URL held as a literal.`);

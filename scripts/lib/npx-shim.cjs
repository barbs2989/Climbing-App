// Windows only: `node npx-shim.cjs <tool> <args…>` — what scripts/lib/npx.mjs runs in place of `npx`.
//
// A tool installed in this repo (vite, esbuild) is loaded IN THIS PROCESS from its own `bin` entry,
// so the process a guard spawned IS the tool. That matters for every browser walk: they stop their
// dev server with `server.kill()`, and on Windows killing a wrapper does not kill its child — through
// npm's npx every walk left a vite server running on its port after it exited.
//
// Anything not installed here (the supabase CLI) goes through npm's own npx, exactly as `npx` would.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const [tool, ...args] = process.argv.slice(2);
if (!tool) { console.error("npx-shim: no tool named"); process.exit(2); }

function localBin(name) {
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const pj = path.join(dir, "node_modules", name, "package.json");
    if (fs.existsSync(pj)) {
      const j = JSON.parse(fs.readFileSync(pj, "utf8"));
      const rel = typeof j.bin === "string" ? j.bin : j.bin && j.bin[name];
      return rel ? { file: path.join(path.dirname(pj), rel), esm: j.type === "module" || rel.endsWith(".mjs") } : null;
    }
    if (path.dirname(dir) === dir) return null;
  }
}

const bin = localBin(tool);
if (bin) {
  process.argv = [process.argv[0], bin.file, ...args];
  if (bin.esm) import(require("node:url").pathToFileURL(bin.file).href).catch((e) => { console.error(e); process.exit(1); });
  else require(bin.file);
} else {
  const npxCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
  const r = spawnSync(process.execPath, [npxCli, tool, ...args], { stdio: "inherit" });
  process.exit(r.status === null ? 1 : r.status);
}

// How a script runs `npx <tool>` or `npm <cmd>` on EVERY platform the guards run on.
//
// `spawn("npx", [...])` works on macOS and Linux and fails on Windows with ENOENT: there the command
// is `npx.cmd`, a batch file. Naming `npx.cmd` does not rescue it — since Node 18.20.2 / 20.12.2
// (CVE-2024-27980) spawning a .cmd without `shell: true` throws EINVAL, and a shell would re-parse
// the argument array: the SQL, JSON and paths the guards pass would be split and globbed.
//
// So on Windows we run a JS entry point with the running node, which keeps the argument array
// exactly as written: for `npx`, npx-shim.cjs (a tool installed here runs IN that process, so
// `server.kill()` stops the dev server rather than orphaning it — see the shim); for `npm`, npm's
// own npm-cli.js. Use it as
//
//   execFileSync(NPX, [...NPX_PRE, "esbuild", entry, ...], opts)
//   spawn(NPM, [...NPM_PRE, "run", "check:outage"], opts)
//
// Anywhere else it is the plain `npx` / `npm` it always was.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIN = process.platform === "win32";

function cliOf(name) {
  // npm ships beside node.exe on a Windows install: <node dir>/node_modules/npm/bin/<name>-cli.js
  const p = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", `${name}-cli.js`);
  if (!fs.existsSync(p)) throw new Error(`scripts/lib/npx.mjs: cannot find ${p} — npm is not installed beside ${process.execPath}`);
  return p;
}

export const NPX = WIN ? process.execPath : "npx";
export const NPX_PRE = WIN ? [fileURLToPath(new URL("./npx-shim.cjs", import.meta.url))] : [];
export const NPM = WIN ? process.execPath : "npm";
export const NPM_PRE = WIN ? [cliOf("npm")] : [];

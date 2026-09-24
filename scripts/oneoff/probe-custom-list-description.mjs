// Does a custom list show its description, and does an empty one stop claiming it is finished?
//
// 0186 gave user_lists a nullable `description`; ListsManager now asks for one when a list is
// created and prints it under the list's name, clamped to two lines while the card is collapsed.
// An empty custom list used to read "Every climb here is logged" when opened — a completion claim
// about a list with no climbs on it — and its collapsed card kept an empty badge row that added
// height for nothing.
//
// SSR renders INITIAL state only, so every custom list here is COLLAPSED (ulOpen starts null) and
// the objectives list is always open. The expanded-list copy is asserted as SOURCE below for that
// reason; a tap cannot be driven from renderToStaticMarkup.
import { build } from "esbuild";
import path from "path"; import os from "os"; import fs from "fs";
import { createRequire } from "module";
import { readCoreSource } from "../lib/guard-sources.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ListsManager from ${JSON.stringify(path.join(ROOT, "lib", "ListsManager.jsx"))};
export function render(props) { return renderToStaticMarkup(React.createElement(ListsManager, props)); }`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-lists-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_e) {} });
const out = path.join(dir, "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const raw = require_(out).render;
const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "’")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

const base = { userLists: [], setUserLists() {}, logs: [], onOpen() {}, crews: [], crewMsgs: {},
  routeById: () => null, objDates: {}, onSetObjDate() {}, onCreateList() {}, onUpdateList() {} };
const DESC = "Wind Rivers trip, first week of August — moderate multi-pitch only.";
const withDesc = { id: "ul_1", name: "Summer projects", description: DESC, routeIds: [], shared: false };
const noDesc = { id: "ul_2", name: "Winter ice", routeIds: [], shared: false };

let bad = 0;
const ok = (c, m) => { if (c) console.log("  ok    " + m); else { console.error("  FAIL  " + m); bad++; } };

const html = raw({ ...base, userLists: [withDesc, noDesc] });
const t = strip(html);
ok(t.length > 400, `the manager rendered (${t.length} chars)`);
ok(t.includes("Summer projects") && t.includes("Winter ice"), "both custom lists render");
ok(t.includes(DESC), "a list's description is on its card");
ok(/-webkit-line-clamp:2/i.test(html), "the collapsed description is clamped to two lines");
ok(!t.includes("Every climb here is logged"), "no list claims every climb is logged");
ok(!/0 climbs to go/.test(t), "an empty custom list shows no to-go badge");
// The card with no description must not render an empty description block.
const cardOf = (name) => { const i = t.indexOf(name); return t.slice(i, i + 120); };
ok(!cardOf("Winter ice").includes(DESC), "a list with no description borrows nobody else's");

// A list whose description is absent entirely (a pre-0186 local row) must still render.
const t2 = strip(raw({ ...base, userLists: [{ id: "ul_3", name: "Old list", routeIds: [] }] }));
ok(t2.includes("Old list"), "a list with no description field at all still renders");

// SOURCE half: the expanded copy, the editor and the create-sheet field.
// Through readCoreSource(): ListsManager moved to lib/ to load lazily.
const src = readCoreSource(ROOT);
ok(src.includes("No climbs on this list yet — add some below."), "an opened empty list says it is empty");
ok(/aria-label="List description"/.test(src), "the create sheet asks for a description");
ok(/onCreateList\(\{localId:_newId,name:_newName,description:_newDesc/.test(src), "a new list's description is handed to the write");
ok(/onUpdateList\(ul\._dbId,\{description:t\}\)/.test(src), "an edited description is persisted");
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
ok(/select\("id, name, icon, description,/.test(db), "useMyLists reads the column back");
ok(/patch\.description =/.test(db) && /description: \(fields\.description/.test(db), "create and update both write it");

if (bad) { console.error(`\nprobe-custom-list-description: ${bad} failure(s)`); process.exit(1); }
console.log("\nok — custom lists carry and show a description, and an empty one says so");

#!/usr/bin/env node
// MEASUREMENT: every supabase read chain in lib/ that asks for ROWS (not a single row, not a count)
// with nothing that bounds how many: no .limit(), .range(), .single(), .maybeSingle(), head:true,
// and no .in()/.eq() on a caller-supplied id list. Reports table, enclosing function, line, and the
// bounding filters it does have, so each can be judged against the table's live row count.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => "lib/" + f)
  .filter((rel) => /\bsupabase\b/.test(fs.readFileSync(path.join(ROOT, rel), "utf8")));

const BOUNDERS = new Set(["limit", "range", "single", "maybeSingle"]);
const FILTERS = new Set(["eq", "neq", "in", "is", "gt", "gte", "lt", "lte", "like", "ilike", "or", "and", "not", "contains", "containedBy", "overlaps", "textSearch", "match", "filter", "cs", "cd"]);
const rows = [];
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    CallExpression(p) {
      // outermost call of a chain that contains .from("T")...select(...)
      if (p.parentPath.isMemberExpression() && p.parentPath.parentPath.isCallExpression() && p.parentPath.node.object === p.node) return; // not outermost
      const chain = []; let n = p.node, table = null, hasSelect = false, head = false, selectArg = null;
      while (n && n.type === "CallExpression" && n.callee.type === "MemberExpression") {
        const name = n.callee.property.name; chain.push(name);
        if (name === "from" && n.arguments[0] && n.arguments[0].type === "StringLiteral") table = n.arguments[0].value;
        if (name === "select") { hasSelect = true; selectArg = n.arguments[0] && n.arguments[0].type === "StringLiteral" ? n.arguments[0].value : "?"; const o = n.arguments[1]; if (o && o.type === "ObjectExpression" && o.properties.some((q) => q.key && q.key.name === "head" && q.value.value === true)) head = true; }
        if (name === "rpc") { table = "rpc:" + (n.arguments[0] && n.arguments[0].value); }
        n = n.callee.object;
      }
      if (!table || !hasSelect || head) return;
      if (chain.some((c) => ["insert", "update", "delete", "upsert"].includes(c))) return; // a write's .select() returns what it wrote
      if (chain.some((c) => BOUNDERS.has(c))) return;
      const filters = chain.filter((c) => FILTERS.has(c));
      const fn = p.findParent((q) => q.isFunctionDeclaration() || (q.isVariableDeclarator() && q.node.init && /Function/.test(q.node.init.type)));
      const fnName = fn ? (fn.node.id && fn.node.id.name) : "?";
      rows.push({ rel, line: p.node.loc.start.line, table, fnName, select: selectArg, filters: filters.join(",") || "NONE" });
    },
  });
}
rows.sort((a, b) => a.table.localeCompare(b.table) || a.line - b.line);
for (const r of rows) console.log(`${r.table.padEnd(26)} ${r.rel}:${String(r.line).padEnd(5)} ${r.fnName.padEnd(30)} filters=${r.filters.padEnd(14)} select=${r.select.length > 40 ? r.select.slice(0, 37) + "..." : r.select}`);
console.log(`\n${rows.length} unbounded row reads over ${new Set(rows.map((r) => r.table)).size} tables/rpcs across ${files.length} lib files`);

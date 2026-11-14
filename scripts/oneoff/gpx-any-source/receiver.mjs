// Local receiver for the in-browser Peakbagger harvest, so the page never has to download files.
// Listens on 127.0.0.1 only. POST /save?name=<file> with a JSON body writes <dir>/<file>.json.
// Usage: node receiver.mjs <dir> [port]
import http from "http";
import fs from "fs";
import path from "path";

const dir = process.argv[2], port = +(process.argv[3] || 8765);
fs.mkdirSync(dir, { recursive: true });
const cors = {
  "Access-Control-Allow-Origin": "https://www.peakbagger.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, "http://127.0.0.1");
  const name = (u.searchParams.get("name") || "").replace(/[^a-z0-9_-]/gi, "");
  if (req.method !== "POST" || u.pathname !== "/save" || !name) { res.writeHead(400, cors); return res.end("bad"); }
  let body = "";
  req.on("data", c => { body += c; if (body.length > 200e6) req.destroy(); });
  req.on("end", () => {
    try { JSON.parse(body); } catch { res.writeHead(422, cors); return res.end("not json"); }
    const f = path.join(dir, name + ".json");
    fs.writeFileSync(f, body);
    console.log(new Date().toISOString(), "saved", f, body.length);
    res.writeHead(200, cors); res.end("ok");
  });
}).listen(port, "127.0.0.1", () => console.log("receiver on", port, "->", dir));

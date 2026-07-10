import http from "http";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.APP_PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html":"text/html",".js":"application/javascript",
  ".css":"text/css",".json":"application/json",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
  ".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",
  ".webp":"image/webp",".mp4":"video/mp4",".webm":"video/webm",
  ".woff2":"font/woff2",".woff":"font/woff",".ttf":"font/ttf",
};

function fetchKick(cb) {
  execFile("curl", [
    "-s","-L","--max-time","8",
    "-H","Accept: application/json",
    "-H","User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
    "-H","Referer: https://kick.com/",
    "https://kick.com/api/v2/channels/maramjk/livestream",
  ], { timeout: 10000 }, (err, stdout) => {
    if (err || !stdout) return cb({ live: false });
    try {
      const d = JSON.parse(stdout);
      if (d && d.data) {
        cb({ live: true, title: d.data.session_title || "", viewers: d.data.viewer_count ?? 0 });
      } else {
        cb({ live: false });
      }
    } catch { cb({ live: false }); }
  });
}

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const url = req.url.split("?")[0];

  if (url === "/api/kick/live") {
    fetchKick((data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  let file = path.join(PUBLIC, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(PUBLIC, "index.html");
  }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, "0.0.0.0", () => console.log(`Listening on ${PORT}`));

import http from "http";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.APP_PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html", ".js": "application/javascript",
  ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".woff2": "font/woff2", ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function fetchKickLive(cb) {
  const url = "https://kick.com/api/v2/channels/maramjk/livestream";
  const args = [
    "-s", "-L", "--max-time", "8",
    "-H", "Accept: application/json",
    "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "-H", "Referer: https://kick.com/",
    url,
  ];
  execFile("curl", args, { timeout: 10000 }, (err, stdout) => {
    if (err || !stdout) return cb(null, { live: false });
    try {
      const d = JSON.parse(stdout);
      if (d && d.data) {
        cb(null, {
          live: true,
          title: d.data.session_title || d.data.stream_title || "",
          viewers: d.data.viewer_count ?? 0,
        });
      } else {
        cb(null, { live: false });
      }
    } catch { cb(null, { live: false }); }
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/api/kick/live" || req.url.startsWith("/api/kick/live?")) {
    fetchKickLive((_, data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  let filePath = path.join(PUBLIC, req.url.split("?")[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC, "index.html");
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

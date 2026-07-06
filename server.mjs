import { createServer } from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, createReadStream, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.APP_PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

async function getKickLive() {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-s", "--max-time", "8",
      "-H", "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "-H", "Accept: application/json",
      "-H", "Accept-Language: en-US,en;q=0.9",
      "-H", "Referer: https://kick.com/",
      "https://kick.com/api/v2/channels/maramjk/livestream",
    ], { timeout: 10000 });
    const json = JSON.parse(stdout);
    if (json && json.data) {
      return { live: true, title: json.data.session_title || "Live Stream", viewers: json.data.viewers || 0 };
    }
    return { live: false };
  } catch (e) {
    console.error("Kick API error:", e.message);
    return { live: false };
  }
}

const server = createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  console.log(req.method, url);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url === "/api/kick/live") {
    const data = await getKickLive();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
    return;
  }

  const publicDir = join(__dirname, "public");
  if (existsSync(publicDir)) {
    let filePath = url === "/" ? join(publicDir, "index.html") : join(publicDir, url);
    if (!existsSync(filePath)) {
      filePath = join(publicDir, "index.html");
    }
    try {
      const stat = statSync(filePath);
      const ext = extname(filePath).toLowerCase();
      const mime = MIME[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime, "Content-Length": stat.size });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", message: "Maramjk API is running" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Maramjk server running on port", PORT);
});

import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");
const distDir = join(here, "..", "..", "platforms", "web", "dist");
const distEntry = join(distDir, "index.js");

if (!existsSync(distEntry)) {
  console.error(
    `[web-e2e] Built web component not found at ${distEntry}\n` +
      "Build it first: `dev web build` (or `pnpm --dir platforms/web build`).",
  );
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveRequestPath(rawUrl) {
  const clean = normalize(decodeURIComponent(rawUrl.split("?")[0]));
  if (clean.startsWith("/dist/")) {
    const full = join(distDir, clean.slice("/dist/".length));
    return full.startsWith(distDir) ? full : null;
  }
  const full = join(fixturesDir, clean === "/" ? "host.html" : clean);
  return full.startsWith(fixturesDir) ? full : null;
}

const server = createServer(async (req, res) => {
  const filePath = resolveRequestPath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[web-e2e] serving fixtures + built dist on http://127.0.0.1:${PORT}`);
});

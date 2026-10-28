import { createServer } from "node:http";
import { access, readFile, readdir } from "node:fs/promises";

const dist = new URL("../../dist/", import.meta.url);
const bundle = new URL("shopify-checkout.js", dist);
await access(bundle).catch(() => {
  throw new Error("Built web component not found. Run `dev web build` first.");
});

const files = new Map([
  ["/", [new URL("./fixtures/host.html", import.meta.url), "text/html"]],
  ["/cdn", [new URL("./fixtures/cdn-host.html", import.meta.url), "text/html"]],
]);
// Serve only built JavaScript files from each distribution.
for (const [prefix, directory] of [
  ["/dist", dist],
  ["/cdn", new URL("../../dist-cdn/", import.meta.url)],
]) {
  for (const path of await readdir(directory, { recursive: true })) {
    if (path.endsWith(".js"))
      files.set(`${prefix}/${path}`, [new URL(path, directory), "text/javascript"]);
  }
}

createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const file = files.get(path);
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const [url, contentType] = file;
    const body = await readFile(url);
    response.writeHead(200, {
      "content-type": `${contentType}; charset=utf-8`,
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(500).end("Could not read fixture");
  }
}).listen(Number(process.env.WEB_E2E_PORT ?? 4321), "127.0.0.1");

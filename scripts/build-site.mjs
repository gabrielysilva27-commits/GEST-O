import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceIndexPath = path.join(projectRoot, "index.html");
const sourceAssetsPath = path.join(projectRoot, "assets");
const distPath = path.join(projectRoot, "dist");
const distServerPath = path.join(distPath, "server");

const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function listFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

async function buildAssetMap() {
  const files = await listFiles(sourceAssetsPath);
  const assets = [];

  const indexHtml = await fs.readFile(sourceIndexPath, "utf8");
  assets.push({
    route: "/",
    kind: "text",
    contentType: "text/html; charset=utf-8",
    body: indexHtml
  });
  assets.push({
    route: "/index.html",
    kind: "text",
    contentType: "text/html; charset=utf-8",
    body: indexHtml
  });

  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath).split(path.sep).join("/");
    const route = `/${relativePath}`;
    const contentType = contentTypeFor(filePath);

    if (textExtensions.has(path.extname(filePath).toLowerCase())) {
      assets.push({
        route,
        kind: "text",
        contentType,
        body: await fs.readFile(filePath, "utf8")
      });
      continue;
    }

    assets.push({
      route,
      kind: "base64",
      contentType,
      body: (await fs.readFile(filePath)).toString("base64")
    });
  }

  return assets.sort((left, right) => left.route.localeCompare(right.route));
}

function renderServerModule(assets) {
  const serializedAssets = JSON.stringify(assets);

  return `const assets = new Map(${serializedAssets}.map((entry) => [entry.route, entry]));

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function cacheControlFor(route) {
  if (route === "/" || route.endsWith(".html")) {
    return "no-cache";
  }

  return "no-cache";
}

function buildResponse(asset) {
  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers({
    "content-type": asset.contentType,
    "cache-control": cacheControlFor(asset.route)
  });

  const body = asset.kind === "base64" ? decodeBase64(asset.body) : asset.body;
  return new Response(body, { status: 200, headers });
}

export class Presence {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const now = Date.now();
    const current = (await this.state.storage.get("users")) || [];
    const users = current.filter((item) => now - Number(item.lastSeenAt || 0) < 90000);

    if (request.method === "POST") {
      const body = await request.json();
      if (!body || !body.userId || !body.name || !body.module) {
        return Response.json({ error: "Presença inválida." }, { status: 400 });
      }
      const entry = {
        userId: String(body.userId),
        name: String(body.name).slice(0, 120),
        module: String(body.module).slice(0, 80),
        lastSeenAt: now
      };
      const next = users.filter((item) => item.userId !== entry.userId);
      next.push(entry);
      await this.state.storage.put("users", next);
      return Response.json({ users: next });
    }

    await this.state.storage.put("users", users);
    return Response.json({ users });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";

    if (pathname === "/api/presence") {
      const presence = env.PRESENCE.getByName("lead-gestao-presence");
      return presence.fetch(request);
    }

    const asset = assets.get(pathname);

    if (asset) {
      return buildResponse(asset);
    }

    if (!pathname.includes(".")) {
      return buildResponse(assets.get("/"));
    }

    return buildResponse(null);
  }
};
`;
}

await fs.rm(distPath, { recursive: true, force: true });
await fs.mkdir(distServerPath, { recursive: true });

const assets = await buildAssetMap();
const serverModule = renderServerModule(assets);

await fs.writeFile(path.join(distServerPath, "index.js"), serverModule, "utf8");

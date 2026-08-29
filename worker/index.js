const REPO_OWNER = "gabrielysilva27-commits";
const REPO_NAME = "GEST-O";
const REPO_BRANCH = "main";
const REPO_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;

function resolveAssetPath(pathname) {
  if (!pathname || pathname === "/") {
    return "/index.html";
  }

  if (!pathname.includes(".")) {
    return "/index.html";
  }

  return pathname;
}

function cacheControlFor(pathname) {
  if (pathname.endsWith(".html")) {
    return "no-cache";
  }

  if (pathname.endsWith(".css") || pathname.endsWith(".js")) {
    return "public, max-age=31536000, immutable";
  }

  return "public, max-age=86400";
}

function contentTypeFor(pathname, upstreamResponse) {
  if (pathname.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (pathname.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (pathname.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }

  if (pathname.endsWith(".png")) {
    return "image/png";
  }

  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return upstreamResponse.headers.get("content-type") || "application/octet-stream";
}

function applySecurityHeaders(headers) {
  headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.delete("cross-origin-resource-policy");
  headers.delete("x-frame-options");
  headers.delete("x-xss-protection");
}

async function fetchFromRepository(pathname, request) {
  const upstreamUrl = new URL(`${REPO_BASE_URL}${pathname}`);
  upstreamUrl.search = new URL(request.url).search;

  return fetch(upstreamUrl, {
    headers: {
      "user-agent": "lead-gestao-worker",
      "cache-control": "no-cache"
    },
    // GitHub main is the publication source. Revalidate it on every request so
    // a deploy never mixes a new stylesheet with an older HTML or script file.
    cache: "no-store"
  });
}

function buildResponse(upstreamResponse, pathname) {
  const headers = new Headers();
  const etag = upstreamResponse.headers.get("etag");
  const lastModified = upstreamResponse.headers.get("last-modified");

  if (etag) {
    headers.set("etag", etag);
  }

  if (lastModified) {
    headers.set("last-modified", lastModified);
  }

  headers.set("content-type", contentTypeFor(pathname, upstreamResponse));
  headers.set("cache-control", cacheControlFor(pathname));
  headers.set("x-lead-source", "github-main");
  applySecurityHeaders(headers);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = resolveAssetPath(url.pathname);
    const upstreamResponse = await fetchFromRepository(pathname, request);

    if (upstreamResponse.status === 404 && pathname !== "/index.html" && !pathname.includes(".")) {
      const fallbackResponse = await fetchFromRepository("/index.html", request);
      return buildResponse(fallbackResponse, "/index.html");
    }

    return buildResponse(upstreamResponse, pathname);
  }
};

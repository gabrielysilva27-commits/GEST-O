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

async function fetchFromRepository(pathname, request) {
  const upstreamUrl = new URL(`${REPO_BASE_URL}${pathname}`);
  upstreamUrl.search = new URL(request.url).search;

  return fetch(upstreamUrl, {
    headers: {
      "user-agent": "lead-gestao-worker"
    },
    cf: {
      cacheTtl: pathname.endsWith(".html") ? 0 : 3600,
      cacheEverything: !pathname.endsWith(".html")
    }
  });
}

function buildResponse(upstreamResponse, pathname) {
  const headers = new Headers(upstreamResponse.headers);
  headers.set("cache-control", cacheControlFor(pathname));
  headers.set("x-lead-source", "github-main");

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

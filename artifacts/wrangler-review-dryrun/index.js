// src/lib/legacy-redirects.mjs
var verifiedLegacyRedirects = /* @__PURE__ */ new Map([
  ["/free-betting-tips-old", "/free-betting-tips"],
  ["/live-streaming-top-bookmakers", "/best-betting-sites-for-live-sports-streaming"],
  ["/william-hill-scratch-of-the-day", "/william-hill-review"],
  ["/william-hill-acca-club", "/acca-insurance/william-hill"],
  ["/bet365-tournament-challenge-win-up-to-250000-during-the-world-cup.html", "/bet365-review"],
  ["/bet365-pays-out-30m-on-sub-on-play-on-offer.html", "/bet365-review"],
  ["/bet365-world-cup-offer", "/bet365-review"],
  ["/football-world-cup-offer", "/bet365-review"],
  ["/qf-value-tips-review.html", "/free-horse-racing-tips"],
  ["/betting-gods-review.html", "/free-horse-racing-tips"],
  ["/professional-sports-betting-tipsters", "/free-horse-racing-tips"],
  ["/professional-tipster-views-tips", "/free-horse-racing-tips"],
  ["/winning-professional-tipsters", "/free-horse-racing-tips"],
  ["/courses-hippiques-pronostics-gratuits.html", "/france-horse-racing-tips.html"]
]);

// src/worker/index.mjs
var index_default = {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    if (verifiedLegacyRedirects.has(path)) {
      return Response.redirect(new URL(verifiedLegacyRedirects.get(path), url), 301);
    }
    if (path.includes("\\") || path.includes("//") || /\.[^/]+\/?$/.test(path)) {
      return new Response("Not Found", { status: 404 });
    }
    if (path !== "/" && path.endsWith("/") && !path.startsWith("/pilot/")) {
      return new Response("Not Found", { status: 404 });
    }
    const assetPath = path === "/" ? "/index.html" : `${path.replace(/\/$/, "")}/index.html`;
    const assetUrl = new URL(assetPath, url);
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (!response.ok) return new Response("Not Found", { status: 404 });
    return response;
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

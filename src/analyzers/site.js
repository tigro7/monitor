export async function checkSite(url) {
  const start = Date.now();
  let statusCode = 0;
  let status = "down";
  let sslValid = false;
  let responseTimeMs = 0;
  let html = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ProjectMonitor/1.0" },
    });
    clearTimeout(timeout);

    statusCode = res.status;
    responseTimeMs = Date.now() - start;
    status = res.ok ? "up" : "error";
    sslValid = url.startsWith("https://");
    html = await res.text();
  } catch (err) {
    responseTimeMs = Date.now() - start;
    status = err.name === "AbortError" ? "timeout" : "down";
    return {
      status,
      statusCode,
      responseTimeMs,
      sslValid,
      brokenLinks: [],
      missingMeta: ["Could not fetch page"],
      lighthouseScore: null,
    };
  }

  // Parse meta tags
  const missingMeta = [];
  const metaChecks = [
    { tag: 'meta[name="description"]', label: "meta description" },
    { tag: 'meta[property="og:title"]', label: "og:title" },
    { tag: 'meta[property="og:image"]', label: "og:image" },
    { tag: 'link[rel="canonical"]', label: "canonical" },
    { tag: "title", label: "page title" },
  ];

  for (const check of metaChecks) {
    // Simple regex-based check (no DOM parser in Node)
    const pattern = check.tag.replace("[", "\\[").replace("]", "\\]");
    const simpleCheck = check.tag.split("[")[0]; // "meta", "link", "title"
    const attr = check.tag.match(/\[(.+?)\]/)?.[1]; // e.g. name="description"

    if (attr) {
      const [attrName, attrValue] = attr.split("=");
      const attrValueClean = attrValue?.replace(/"/g, "");
      if (
        !html.includes(`${attrName}="${attrValueClean}"`) &&
        !html.includes(`${attrName}='${attrValueClean}'`)
      ) {
        missingMeta.push(check.label);
      }
    } else if (check.label === "page title") {
      if (!html.includes("<title") && !html.includes("<TITLE")) {
        missingMeta.push(check.label);
      }
    }
  }

  // Extract links and check for broken ones (limited to same-origin, max 10)
  const linkRegex = /href=["']([^"'#?]+)["']/g;
  const links = new Set();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("/") || href.startsWith(url)) {
      const fullUrl = href.startsWith("/")
        ? new URL(href, url).toString()
        : href;
      links.add(fullUrl);
    }
  }

  const sameDomainLinks = [...links].slice(0, 10);
  const brokenLinks = [];

  for (const link of sameDomainLinks) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(link, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "ProjectMonitor/1.0" },
      });
      if (!res.ok) brokenLinks.push({ url: link, status: res.status });
    } catch {
      brokenLinks.push({ url: link, status: "unreachable" });
    }
  }

  // Lightweight performance hints (no real Lighthouse in CI — flag obvious issues)
  let lighthouseScore = null;
  const htmlSize = Buffer.byteLength(html, "utf8");
  const inlineScripts = (html.match(/<script(?![^>]*src)[^>]*>/gi) || [])
    .length;
  const unoptimizedImages = (
    html.match(/<img(?![^>]*loading=["']lazy["'])[^>]*>/gi) || []
  ).length;

  // Rough heuristic score
  let score = 100;
  if (responseTimeMs > 3000) score -= 30;
  else if (responseTimeMs > 1500) score -= 15;
  if (htmlSize > 500000) score -= 20;
  if (inlineScripts > 5) score -= 10;
  if (unoptimizedImages > 5) score -= 10;
  if (statusCode !== 200) score -= 30;
  lighthouseScore = Math.max(0, score);

  return {
    status,
    statusCode,
    responseTimeMs,
    sslValid,
    brokenLinks,
    missingMeta,
    lighthouseScore,
    htmlSizeKb: Math.round(htmlSize / 1024),
  };
}

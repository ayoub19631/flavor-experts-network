#!/usr/bin/env node
/**
 * Fetches known public/alias routes and reports HTTP failures.
 * Usage: node scripts/scan-route-reachability.mjs https://flavorexpertsnetwork.com
 */
const origin = (process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const PUBLIC_PATHS = [
  "/",
  "/welcome",
  "/auth",
  "/terms",
  "/privacy",
  "/pricing",
  "/enterprise",
  "/community",
  "/insights",
  "/publications",
  "/publications/books",
  "/publications/research",
  "/library",
  "/books",
  "/research",
  "/policies",
  "/members",
  "/companies",
  "/jobs",
  "/forum",
  "/marketplace",
  "/marketplace/suppliers",
  "/marketplace/materials",
  "/market",
  "/blog",
  "/consultations",
  "/events",
  "/discover",
  "/search",
  "/courses",
];

const results = [];
for (const path of PUBLIC_PATHS) {
  const url = `${origin}${path}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    results.push({ path, status: response.status, ok: response.ok || response.status < 500, finalUrl: response.url });
  } catch (error) {
    results.push({ path, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const failed = results.filter((row) => !row.ok);
for (const row of results) {
  console.log(`${row.ok ? "PASS" : "FAIL"} ${row.status || "ERR"} ${row.path}${row.finalUrl ? ` -> ${row.finalUrl}` : ""}${row.error ? ` ${row.error}` : ""}`);
}
if (failed.length) {
  console.error(`Route reachability failed: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`Route reachability passed: ${results.length}/${results.length}`);

#!/usr/bin/env node
/**
 * Three-run mobile Lighthouse medians for public hubs.
 * Device: system Chrome. Form factor: mobile. Throttling: Lighthouse default simulated Slow 4G.
 * TBT is recorded only as a lab proxy. It is not INP.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/lighthouse");
const workDir = join(tmpdir(), "fen-lh");
mkdirSync(outDir, { recursive: true });
mkdirSync(workDir, { recursive: true });

const origin = (process.argv[2] || "https://flavorexpertsnetwork.com").replace(/\/$/, "");
const pages = [
  { id: "home", path: "/" },
  { id: "publications", path: "/publications" },
  { id: "search", path: "/search" },
  { id: "marketplace", path: "/marketplace" },
  { id: "discover", path: "/discover" },
];

const chrome = process.env.CHROME_PATH
  || (process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "google-chrome");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function score(value) {
  return value == null ? null : Math.round(value * 100);
}

const summary = {
  generated_at: new Date().toISOString(),
  origin,
  device: "desktop Chrome driving Lighthouse mobile emulation",
  form_factor: "mobile",
  throttling: "lighthouse default simulated Slow 4G",
  runs_per_page: 3,
  note: "TBT is a lab proxy, not INP.",
  pages: [],
};

for (const page of pages) {
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const jsonPath = join(workDir, `${page.id}-run${i}.json`);
    const args = [
      "--yes",
      "lighthouse@12.8.1",
      `${origin}${page.path}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--output=json",
      `--output-path=${jsonPath}`,
      "--quiet",
      `--chrome-path=${chrome}`,
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
    ];
    const result = spawnSync("npx", args, { cwd: root, encoding: "utf8", shell: process.platform === "win32", timeout: 180000 });
    if (result.status !== 0 || !existsSync(jsonPath)) {
      runs.push({ error: (result.stderr || result.stdout || "lighthouse failed").slice(0, 800) });
      continue;
    }
    copyFileSync(jsonPath, join(outDir, `${page.id}-run${i}.json`));
    const report = JSON.parse(readFileSync(jsonPath, "utf8"));
    const cats = report.categories || {};
    const audits = report.audits || {};
    runs.push({
      performance: score(cats.performance?.score),
      accessibility: score(cats.accessibility?.score),
      best_practices: score(cats["best-practices"]?.score),
      seo: score(cats.seo?.score),
      lcp_ms: audits["largest-contentful-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbt_ms: audits["total-blocking-time"]?.numericValue ?? null,
      third_party_ms: audits["third-party-summary"]?.numericValue ?? null,
      bootup_js_ms: audits["bootup-time"]?.numericValue ?? null,
      unused_js_ms: audits["unused-javascript"]?.numericValue ?? null,
    });
  }
  const ok = runs.filter((run) => !run.error);
  summary.pages.push({
    ...page,
    url: `${origin}${page.path}`,
    runs,
    median: ok.length === 3 ? {
      performance: median(ok.map((r) => r.performance)),
      accessibility: median(ok.map((r) => r.accessibility)),
      best_practices: median(ok.map((r) => r.best_practices)),
      seo: median(ok.map((r) => r.seo)),
      lcp_ms: Math.round(median(ok.map((r) => r.lcp_ms))),
      cls: Number(median(ok.map((r) => r.cls)).toFixed(3)),
      tbt_ms: Math.round(median(ok.map((r) => r.tbt_ms))),
    } : null,
  });
  console.log(page.id, JSON.stringify(summary.pages.at(-1).median || summary.pages.at(-1).runs));
}

writeFileSync(join(outDir, "phase9-median.json"), JSON.stringify(summary, null, 2));
console.log(`Wrote ${join(outDir, "phase9-median.json")}`);

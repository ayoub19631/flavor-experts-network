#!/usr/bin/env node
/**
 * Fails CI on new critical/high advisories. Known leftovers must be listed
 * in docs/security/audit-allowlist.json with a reason.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const allowPath = join(root, "docs/security/audit-allowlist.json");
const allow = JSON.parse(readFileSync(allowPath, "utf8"));
const allowed = new Set((allow.items || []).map((item) => `${item.module}:${item.github_advisory_id}`));

const result = spawnSync("pnpm", ["audit", "--json"], {
  cwd: join(root, "app/frontend"),
  encoding: "utf8",
  shell: process.platform === "win32",
});

const raw = (result.stdout || "").replace(/^\uFEFF/, "");
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("Unable to parse pnpm audit JSON.");
  process.exit(1);
}

const advisories = Object.values(report.advisories || {});
const blocking = [];
const allowedHits = [];

for (const advisory of advisories) {
  if (advisory.severity !== "critical" && advisory.severity !== "high") continue;
  const key = `${advisory.module_name}:${advisory.github_advisory_id || advisory.url || advisory.title}`;
  const ghsa = advisory.github_advisory_id || (String(advisory.url || "").match(/GHSA-[a-z0-9-]+/) || [])[0] || "";
  const compact = `${advisory.module_name}:${ghsa}`;
  if (allowed.has(compact) || allowed.has(key)) {
    allowedHits.push(compact);
    continue;
  }
  blocking.push({
    module: advisory.module_name,
    severity: advisory.severity,
    ghsa,
    title: advisory.title,
    paths: (advisory.findings || []).flatMap((finding) => finding.paths || []).slice(0, 4),
  });
}

console.log(`Audit allowlist hits: ${allowedHits.length}`);
if (blocking.length) {
  console.error("New critical/high advisories are not on the allowlist:");
  for (const item of blocking) {
    console.error(JSON.stringify(item));
  }
  process.exit(1);
}

console.log("Dependency audit passed (no undocumented critical/high).");

#!/usr/bin/env node
/**
 * Full-repo secrets scan for CI. Does not print matched secret values.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const skipFileNames = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "approved-migration-history.json",
]);

const placeholderJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

const rules = [
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "aws-access-key", re: /AKIA[0-9A-Z]{16}/ },
  { id: "generic-secret-assignment", re: /(?:SERVICE_ROLE|SECRET_KEY|PRIVATE_KEY|VERCEL_TOKEN|SUPABASE_DB_PASSWORD|RESEND_API_KEY|OPENAI_API_KEY)\s*[:=]\s*['\"]?(?!(?:changeme|placeholder|your-|xxx))[A-Za-z0-9_/+.-]{16,}/i },
  { id: "supabase-service-jwt", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
];

function trackedFiles() {
  const out = execSync("git ls-files -z", { encoding: "buffer" });
  return out
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((rel) => {
      const name = rel.split("/").pop();
      if (skipFileNames.has(name)) return false;
      if (rel.startsWith(".cursor/")) return false;
      return !/\.(png|jpg|jpeg|ico|woff2|zip|apk)$/i.test(rel);
    });
}

function isAllowedJwt(value, rel) {
  if (value.includes(placeholderJwt) || value.includes(".e30.placeholder")) return true;
  if (rel.replaceAll("\\", "/").includes(".env.example")) return true;
  return false;
}

const files = trackedFiles();
const findings = [];

for (const rel of files) {
  const file = join(root, rel);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (rel.endsWith(".example") && /VITE_SUPABASE_ANON_KEY=/.test(text) && !/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(text.replace(placeholderJwt, ""))) {
    continue;
  }
  for (const rule of rules) {
    const matches = text.match(rule.re);
    if (!matches) continue;
    const snippet = matches[0];
    if (rule.id === "supabase-service-jwt" && isAllowedJwt(snippet, rel)) continue;
    if (rule.id === "supabase-service-jwt" && rel.startsWith("electron/") && /supabase\.co/.test(text)) {
      // Historical Electron bundle may embed the public anon JWT. Flag only if a service-role marker is present.
      if (!/service_role|SERVICE_ROLE/i.test(text)) continue;
    }
    findings.push({ file: rel, rule: rule.id });
  }
}

if (findings.length) {
  console.error("Secrets scan failed. Locations only — values are not printed.");
  for (const item of findings) console.error(`${item.rule} ${item.file}`);
  process.exit(1);
}

console.log(`Secrets scan passed (${files.length} files).`);

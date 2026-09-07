#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const frontend = join(dirname(fileURLToPath(import.meta.url)), "../app/frontend");
const pkg = JSON.parse(readFileSync(join(frontend, "package.json"), "utf8"));
const names = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
].filter((name) => name.startsWith("@capacitor/"));

const require = createRequire(join(frontend, "package.json"));
const majors = new Map();
for (const name of names) {
  if (name === "@capacitor/assets") continue;
  const resolved = require(`${name}/package.json`);
  const major = String(resolved.version).split(".")[0];
  majors.set(name, { version: resolved.version, major });
}

const unique = [...new Set([...majors.values()].map((item) => item.major))];
console.log("Capacitor packages:", Object.fromEntries([...majors].map(([name, item]) => [name, item.version])));
if (unique.length !== 1) {
  console.error("Capacitor major versions are mixed:", unique.join(", "));
  process.exit(1);
}
if (unique[0] !== "8") {
  console.error(`Expected Capacitor major 8, found ${unique[0]}`);
  process.exit(1);
}
console.log(`Capacitor packages share major ${unique[0]}.`);

// Copies the freshly built frontend (app/frontend/dist) into electron/web so
// the bundled offline snapshot matches the current release.
// Uses robocopy on Windows (robust with non-ASCII paths), cpSync elsewhere.
import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "app", "frontend", "dist");
const dest = join(here, "web");

if (!existsSync(src)) {
  console.warn("sync-web: app/frontend/dist not found — run `pnpm -C app/frontend build` first. Keeping existing web/ snapshot.");
  process.exit(0);
}

if (process.platform === "win32") {
  rmSync(dest, { recursive: true, force: true });
  // robocopy exit codes 0-7 are success
  try {
    execFileSync("robocopy", [src, dest, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS"], { stdio: "inherit" });
  } catch (err) {
    if (typeof err.status === "number" && err.status > 7) throw err;
  }
} else {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}
console.log("sync-web: copied app/frontend/dist -> electron/web");

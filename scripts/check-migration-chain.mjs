#!/usr/bin/env node
/**
 * Phase 6G CI guard for the Supabase migration chain.
 * Fails on unordered timestamps, forward-time dependencies,
 * unregistered local files, applied-file edits without docs,
 * and the historical non-immutable GENERATED search_vector.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const lockPath = join(root, "supabase", "approved-migration-history.json");
const writeLock = process.argv.includes("--write-lock");

const PHASE6_CREATES = {
  "20260902120000": [
    "publications",
    "publication_translations",
    "publication_files",
    "publication_authors",
    "publication_versions",
    "publication_events",
    "publication_settings",
    "publication_staff",
    "book_chapters",
    "reading_progress",
  ],
  "20260907200000": [
    "publication_contributors",
    "publication_review_actions",
    "publication_related",
  ],
  "20260907201000": [
    "publications",
    "publication_translations",
    "publication_files",
    "publication_authors",
    "publication_versions",
    "publication_events",
    "publication_settings",
    "publication_staff",
  ],
};

const PHASE6_REQUIRES = {
  "20260907200000": ["publications"],
  "20260907201000": ["lesson_resources"],
  "20260907210000": ["publications", "publication_review_actions"],
  "20260907220000": ["publications", "publication_files", "publication_settings"],
  "20260907230000": ["publications", "publication_events", "publication_related"],
  "20260907240000": ["publications", "publication_staff"],
  "20260907250000": ["publications", "publication_authors", "reading_progress"],
};

const errors = [];

function normalizeSql(buf) {
  return buf.toString("utf8").replace(/\r\n/g, "\n");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

function loadFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .sort()
    .map((name) => {
      const version = name.slice(0, 14);
      const sql = normalizeSql(readFileSync(join(migrationsDir, name)));
      return { name, version, sql, sha256: sha256(sql) };
    });
}

function createdTables(sql) {
  const found = new Set();
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi;
  let match;
  while ((match = re.exec(sql))) found.add(match[1]);
  return found;
}

function applyHintVersions(sql) {
  const found = [];
  const re = /Apply\s+(\d{14})_/g;
  let match;
  while ((match = re.exec(sql))) found.push(match[1]);
  return found;
}

const files = loadFiles();
if (files.length === 0) errors.push("No migration files found.");

let previous = "";
for (const file of files) {
  if (file.version <= previous) {
    errors.push(`Timestamp out of order: ${file.name} follows ${previous}`);
  }
  previous = file.version;
  const body = stripSqlComments(file.sql);
  if (
    /create\s+table[\s\S]{0,4000}publications/i.test(body) &&
    /search_vector\s+tsvector\s+GENERATED\s+ALWAYS\s+AS/i.test(body) &&
    /to_tsvector\s*\(/i.test(body)
  ) {
    errors.push(`${file.name} uses a non-immutable GENERATED to_tsvector expression`);
  }
}

const createdByVersion = new Map();
for (const file of files) {
  const tables = new Set([
    ...createdTables(file.sql),
    ...(PHASE6_CREATES[file.version] || []),
  ]);
  createdByVersion.set(file.version, tables);
}

function firstCreator(table) {
  for (const file of files) {
    if (createdByVersion.get(file.version)?.has(table)) return file.version;
  }
  return null;
}

for (const file of files) {
  for (const hinted of applyHintVersions(file.sql)) {
    if (hinted > file.version) {
      errors.push(
        `${file.name} tells operators to apply ${hinted} first, but that file is later`
      );
    }
  }
  for (const table of PHASE6_REQUIRES[file.version] || []) {
    const creator = firstCreator(table);
    if (creator && creator > file.version) {
      errors.push(
        `${file.name} requires public.${table}, but that table is first created by later ${creator}`
      );
    }
  }
}

let lock = { production_ref: "imucfofvdwfyexdwrsfe", files: [] };
try {
  lock = JSON.parse(readFileSync(lockPath, "utf8"));
} catch {
  if (!writeLock) errors.push("approved-migration-history.json is missing");
}

const lockByVersion = new Map((lock.files || []).map((row) => [row.version, row]));

if (writeLock) {
  const next = {
    production_ref: "imucfofvdwfyexdwrsfe",
    updated_at: new Date().toISOString(),
    files: files.map((file) => {
      const prev = lockByVersion.get(file.version) || {};
      return {
        version: file.version,
        filename: file.name,
        sha256:
          prev.sha256 && prev.immutable !== false && prev.production_status !== "local"
            ? prev.sha256
            : file.sha256,
        production_status: prev.production_status || "local",
        equivalent_remote: prev.equivalent_remote || null,
        repair_reason: prev.repair_reason || null,
        immutable: prev.immutable !== false,
        documented_edit: prev.documented_edit || null,
      };
    }),
  };
  writeFileSync(lockPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${next.files.length} lock entries`);
  process.exit(0);
}

for (const file of files) {
  const row = lockByVersion.get(file.version);
  if (!row) {
    errors.push(`Local migration ${file.name} is not registered in approved-migration-history.json`);
    continue;
  }
  const recorded = ["applied", "repaired_applied"].includes(row.production_status);
  if (recorded && row.immutable !== false && row.sha256 && row.sha256 !== file.sha256) {
    if (!row.documented_edit) {
      errors.push(
        `Applied migration ${file.name} changed without documented_edit in the history lock`
      );
    }
  }
}

for (const row of lock.files || []) {
  if (!files.some((file) => file.version === row.version)) {
    errors.push(`History lock lists missing file ${row.filename || row.version}`);
  }
}

if (errors.length) {
  console.error("Migration chain checks failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Migration chain OK: ${files.length} files`);

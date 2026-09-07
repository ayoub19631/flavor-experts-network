# Phase 6.1 dependency audit

Counts are `pnpm audit` totals for `app/frontend`.

| | Before | After |
|---|---|---|
| critical | 2 | 1 |
| high | 31 | 13 |
| moderate | 21 | 15 |
| low | 1 | 1 |

## Runtime vs development

Production website runtime is the Vite browser bundle plus Capacitor/Electron shells. The remaining critical/high items are **development or asset-pipeline** packages:

| Package | Path | Reaches Production site? |
|---|---|---|
| `tar@6.2.1` | `@capacitor/assets` → `@capacitor/cli@5.7.8` | No. Local icon/asset generation only. |
| `minimatch@3.0.5` | `@capacitor/assets` → `@trapezedev/project` → `replace` | No. |
| `sharp@0.32.6` | `@capacitor/assets` | No. Direct `sharp@0.35.3` is the maintained copy. |
| `vite@5.4.21` | frontend build | No browser runtime. Windows `server.fs.deny` advisory on the dev server. |

The Capacitor CLI 8 tree now uses `tar@7.5.22`. `postcss`, `nanoid`, `ws`, `js-yaml`, `browserslist`, and `brace-expansion` were patched via `app/frontend/pnpm-workspace.yaml` overrides.

## Why leftovers stay

- `@capacitor/assets@3.0.5` is the latest release and still depends on Capacitor CLI 5 and `sharp@0.32.6`.
- There is no patched `tar@6`. Forcing `tar@7` onto CLI 5 is an incompatible major.
- Vite 5 has no 5.x patch for GHSA-fx2h-pf6j-xcff. Vite 6 is a major and is out of scope for this hardening pass.

CI (`scripts/check-dependency-audit.mjs`) fails on any **new** critical/high advisory that is not listed in `docs/security/audit-allowlist.json`.

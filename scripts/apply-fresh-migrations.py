#!/usr/bin/env python3
"""Apply the local migration chain to a clean temporary Postgres container."""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"
BOOTSTRAP = ROOT / "supabase" / "tests" / "fresh_db" / "bootstrap.sql"
PRE_TABLES = ROOT / "supabase" / "tests" / "fresh_db" / "pre_phase6_tables.sql"
BOOTSTRAP_FNS = ROOT / "supabase" / "tests" / "fresh_db" / "bootstrap_functions.sql"
CONTAINER = "fen-phase6g-pg"
PORT = "55433"


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def psql(sql_file: Path) -> subprocess.CompletedProcess[str]:
    return run(
        [
            "docker",
            "exec",
            "-i",
            CONTAINER,
            "psql",
            "-U",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            f"/migrations/{sql_file.name}" if sql_file.parent == MIGRATIONS else f"/fresh/{sql_file.name}",
        ],
        check=False,
    )


def main() -> int:
    run(["docker", "rm", "-f", CONTAINER], check=False)
    run(
        [
            "docker",
            "run",
            "-d",
            "--name",
            CONTAINER,
            "-e",
            "POSTGRES_PASSWORD=postgres",
            "-e",
            "POSTGRES_HOST_AUTH_METHOD=trust",
            "-p",
            f"{PORT}:5432",
            "postgres:17",
        ]
    )
    for _ in range(40):
        ready = run(
            ["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"],
            check=False,
        )
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        print("Postgres container did not become ready", file=sys.stderr)
        return 1

    run(["docker", "exec", CONTAINER, "mkdir", "-p", "/migrations", "/fresh"])
    run(["docker", "cp", str(BOOTSTRAP), f"{CONTAINER}:/fresh/bootstrap.sql"])
    if PRE_TABLES.exists():
        run(["docker", "cp", str(PRE_TABLES), f"{CONTAINER}:/fresh/pre_phase6_tables.sql"])
    run(["docker", "cp", str(BOOTSTRAP_FNS), f"{CONTAINER}:/fresh/bootstrap_functions.sql"])
    all_files = sorted(p for p in MIGRATIONS.glob("*.sql") if p.name[:14].isdigit())
    # Historical and Phase 4/5 files are represented by the pre-Phase-6 squash.
    # The empty-database chain is the Phase 6 files in timestamp order.
    files = [
        p
        for p in all_files
        if p.name.startswith("20260902120000")
        or (
            p.name.startswith("202609072")
            and not p.name.startswith("20260907201000")
        )
        or p.name.startswith("202609081")
        or p.name.startswith("202609082")
    ]
    print(f"squash_skip={len(all_files) - len(files)} apply={len(files)}")
    for path in files:
        run(["docker", "cp", str(path), f"{CONTAINER}:/migrations/{path.name}"])

    for label, path in (
        ("bootstrap", BOOTSTRAP),
        ("pre_phase6_tables", PRE_TABLES),
        ("bootstrap_functions", BOOTSTRAP_FNS),
    ):
        if not path.exists():
            if label == "pre_phase6_tables":
                continue
            print(f"missing {path}", file=sys.stderr)
            return 1
        result = psql(path)
        if result.returncode != 0:
            print(f"FAILED {label}", file=sys.stderr)
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            return 1
        print(f"OK {label}")

    applied = []
    for path in files:
        result = psql(path)
        if result.returncode != 0:
            print(f"FAILED {path.name}", file=sys.stderr)
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            return 1
        version = path.name[:14]
        name = path.name[15:-4]
        rec = run(
            [
                "docker",
                "exec",
                "-i",
                CONTAINER,
                "psql",
                "-U",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                (
                    "INSERT INTO supabase_migrations.schema_migrations(version, name) "
                    f"VALUES ('{version}', '{name.replace(chr(39), '')}') "
                    "ON CONFLICT (version) DO NOTHING;"
                ),
            ],
            check=False,
        )
        if rec.returncode != 0:
            print(f"FAILED record {path.name}", file=sys.stderr)
            print(rec.stderr, file=sys.stderr)
            return 1
        applied.append(path.name)
        print(f"OK {path.name}")

    smoke = run(
        [
            "docker",
            "exec",
            CONTAINER,
            "psql",
            "-U",
            "postgres",
            "-tAc",
            "select to_regclass('public.publications'), to_regclass('public.rfqs'), to_regclass('public.supplier_profiles')",
        ],
        check=False,
    )
    print(smoke.stdout.strip())
    if "publications" not in smoke.stdout:
        print("smoke check failed: publications missing", file=sys.stderr)
        return 1
    print(f"FRESH_DB_OK files={len(applied)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

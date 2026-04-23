#!/usr/bin/env python3
from __future__ import annotations

import ast
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine.url import make_url

REPO_ROOT = Path(__file__).resolve().parents[1]

SERVICE_FILES: dict[str, Path] = {
    "auth": REPO_ROOT / "app" / "auth" / "service.py",
    "drafts": REPO_ROOT / "app" / "drafts" / "service.py",
    "research_slices": REPO_ROOT / "app" / "research_slices" / "service.py",
    "stories": REPO_ROOT / "app" / "stories" / "service.py",
    "courses": REPO_ROOT / "app" / "courses" / "service.py",
}


def _extract_declared_migration_versions(path: Path) -> tuple[list[int], str | None]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    versions: list[int] = []
    extraction_error: str | None = None
    apply_calls_found = 0

    class Visitor(ast.NodeVisitor):
        def __init__(self) -> None:
            super().__init__()
            self.apply_calls_found = 0
            self.extraction_error: str | None = None

        def visit_Call(self, node: ast.Call) -> None:
            # Find apply_versioned_migrations(connection, [ ...steps... ])
            if isinstance(node.func, ast.Name) and node.func.id == "apply_versioned_migrations" and len(node.args) >= 2:
                self.apply_calls_found += 1
                steps_arg = node.args[1]
                if not isinstance(steps_arg, ast.List):
                    self.extraction_error = "apply_versioned_migrations steps argument is not a literal list"
                else:
                    for element in steps_arg.elts:
                        if not (isinstance(element, ast.Tuple) and element.elts):
                            self.extraction_error = "migration step is not a tuple(version, ...)"
                            continue
                        first = element.elts[0]
                        if isinstance(first, ast.Constant) and isinstance(first.value, int):
                            versions.append(first.value)
                        else:
                            self.extraction_error = "migration version is not a literal integer"
            self.generic_visit(node)

    visitor = Visitor()
    visitor.visit(tree)
    apply_calls_found = visitor.apply_calls_found
    extraction_error = visitor.extraction_error

    if apply_calls_found == 0:
        return [], "apply_versioned_migrations(...) call not found"
    if extraction_error:
        return versions, extraction_error
    if not versions:
        return [], "no declared migration versions were extracted"
    return versions, None


def _build_sqlite_readonly_url(database_url: str) -> tuple[str | None, str | None]:
    try:
        parsed = make_url(database_url)
    except Exception as exc:
        return None, f"invalid DB url: {exc}"

    if parsed.get_backend_name() != "sqlite":
        return database_url, None

    db_name = parsed.database or ""
    if db_name in {"", ":memory:"}:
        # No file-creation side effect for in-memory mode.
        return database_url, None

    db_path = Path(db_name).expanduser()
    if not db_path.is_absolute():
        db_path = (REPO_ROOT / db_path).resolve()

    if not db_path.exists():
        return None, (
            f"sqlite database file does not exist for read-only preflight: {db_path} "
            "(refusing to connect to avoid implicit file creation)"
        )

    # Force sqlite read-only URI mode.
    readonly_url = f"sqlite:///file:{db_path}?mode=ro&uri=true"
    return readonly_url, None


def _check_schema_version_readability(database_url: str) -> tuple[bool, int]:
    readonly_url, url_error = _build_sqlite_readonly_url(database_url)
    if url_error:
        raise RuntimeError(url_error)
    assert readonly_url is not None

    engine = create_engine(readonly_url, connect_args={"check_same_thread": False} if readonly_url.startswith("sqlite") else {})
    with engine.connect() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("schema_version"):
            return False, 0
        rows = connection.execute(text("SELECT COUNT(*) FROM schema_version")).scalar_one()
        return True, int(rows)


def main() -> int:
    database_url = os.getenv("AUTH_DATABASE_URL", "sqlite:///./artemis_auth.db")

    print("[preflight] migration discipline check")
    print(f"[preflight] db_url={database_url}")

    all_versions: dict[int, list[str]] = {}
    domain_versions: dict[str, list[int]] = {}

    for domain, path in SERVICE_FILES.items():
        if not path.exists():
            print(f"[error] missing migration source file: {path}")
            return 2

        versions, extraction_error = _extract_declared_migration_versions(path)
        if extraction_error:
            print(f"[error] cannot reliably extract migration versions from {path}: {extraction_error}")
            return 6
        domain_versions[domain] = versions

        for version in versions:
            all_versions.setdefault(version, []).append(domain)

    duplicates = {version: domains for version, domains in all_versions.items() if len(domains) > 1}
    if duplicates:
        print("[error] duplicate migration version ids detected across domains:")
        for version in sorted(duplicates):
            owners = ", ".join(sorted(duplicates[version]))
            print(f"  - version {version}: {owners}")
        return 3

    for domain, versions in domain_versions.items():
        if versions != sorted(versions):
            print(f"[error] regression/non-monotonic migration order detected in domain '{domain}': {versions}")
            return 4

    try:
        has_schema_version, applied_rows = _check_schema_version_readability(database_url)
    except Exception as exc:
        print(f"[error] db connectivity/read check failed: {exc}")
        return 5

    if has_schema_version:
        print(f"[ok] schema_version table is readable (rows={applied_rows})")
    else:
        print("[warn] schema_version table is not present yet (pre-init state allowed for preflight)")

    total_declared = sum(len(v) for v in domain_versions.values())
    print(f"[ok] declared migration versions validated (count={total_declared})")
    print("[ok] preflight completed (read-only, no migration apply)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

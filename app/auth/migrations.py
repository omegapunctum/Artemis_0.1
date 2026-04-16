from __future__ import annotations

from collections.abc import Callable, Sequence

from sqlalchemy import text
from sqlalchemy.engine import Connection


MigrationStep = tuple[int, str, Callable[[Connection], None]]


def ensure_schema_version_table(connection: Connection) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )


def get_applied_versions(connection: Connection) -> set[int]:
    rows = connection.execute(text("SELECT version FROM schema_version")).fetchall()
    return {int(row[0]) for row in rows}


def apply_versioned_migrations(connection: Connection, steps: Sequence[MigrationStep]) -> None:
    ensure_schema_version_table(connection)
    applied_versions = get_applied_versions(connection)

    for version, name, migration_fn in sorted(steps, key=lambda step: step[0]):
        if version in applied_versions:
            continue
        migration_fn(connection)
        connection.execute(
            text("INSERT INTO schema_version(version, name) VALUES (:version, :name)"),
            {"version": version, "name": name},
        )
        applied_versions.add(version)

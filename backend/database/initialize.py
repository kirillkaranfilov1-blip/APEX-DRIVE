from pathlib import Path
from .connection import connect


def initialize_database(database_path: str | Path, schema_path: str | Path | None = None) -> None:
    database_path = Path(database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    schema_file = Path(schema_path) if schema_path else Path(__file__).with_name("schema.sql")
    connection = connect(database_path)
    try:
        connection.executescript(schema_file.read_text(encoding="utf-8"))
    finally:
        connection.close()

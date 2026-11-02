import json
from pathlib import Path


def read_catalog(path: str | Path) -> list[dict]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Не удалось прочитать каталог: {path}") from error
    if not isinstance(data, list) or not all(isinstance(item, dict) and item.get("id") for item in data):
        raise RuntimeError(f"Неверная структура каталога: {path}")
    return data

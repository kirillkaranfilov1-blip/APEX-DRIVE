from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get("APEX_DATA_DIR", PROJECT_ROOT / "backend" / "data"))
DATABASE_PATH = DATA_DIR / "apex_drive.sqlite3"
VEHICLE_CATALOG = PROJECT_ROOT / "frontend" / "src" / "vehicle" / "vehicleCatalog.json"
TRACK_CATALOG = PROJECT_ROOT / "frontend" / "src" / "tracks" / "trackCatalog.json"
DEFAULT_PLAYER_ID = "local-player"

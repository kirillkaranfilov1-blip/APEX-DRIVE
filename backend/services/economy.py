import json
import sqlite3


class EconomyError(ValueError):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.status = status


def get_profile(connection: sqlite3.Connection, player_id: str) -> dict:
    player = connection.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    if player is None:
        connection.execute("INSERT INTO players(id, display_name) VALUES (?, ?)", (player_id, "Гонщик"))
        connection.execute("INSERT INTO owned_vehicles(player_id, vehicle_id) VALUES (?, ?)", (player_id, "nightrun-club-sport"))
        connection.execute("INSERT INTO career_progress(player_id) VALUES (?)", (player_id,))
        connection.execute("INSERT INTO player_settings(player_id) VALUES (?)", (player_id,))
        player = connection.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    owned = connection.execute("SELECT vehicle_id FROM owned_vehicles WHERE player_id = ? ORDER BY acquired_at", (player_id,)).fetchall()
    career = connection.execute("SELECT * FROM career_progress WHERE player_id = ?", (player_id,)).fetchone()
    return {
        "id": player["id"], "displayName": player["display_name"],
        "credits": player["credits"], "reputation": player["reputation"],
        "selectedVehicleId": player["selected_vehicle_id"],
        "ownedVehicleIds": [row["vehicle_id"] for row in owned],
        "careerStage": career["stage"], "completedEvents": json.loads(career["completed_events"]),
    }


def purchase_vehicle(connection: sqlite3.Connection, *, player_id: str, vehicle: dict, owned_ids: set[str]) -> dict:
    connection.execute("BEGIN IMMEDIATE")
    try:
        player = connection.execute("SELECT credits, reputation FROM players WHERE id = ?", (player_id,)).fetchone()
        if player is None:
            raise EconomyError("profile_missing", "Профиль игрока не найден.", 404)
        if vehicle["id"] in owned_ids:
            raise EconomyError("already_owned", "Этот автомобиль уже в гараже.", 409)
        required_rep = int(vehicle.get("unlock", {}).get("reputation", 0))
        if player["reputation"] < required_rep:
            raise EconomyError("locked", "Пока недостаточно репутации.", 403)
        price = int(vehicle.get("price", -1))
        if price < 0:
            raise EconomyError("invalid_catalog", "У автомобиля некорректная цена.", 500)
        if player["credits"] < price:
            raise EconomyError("insufficient_credits", "Недостаточно кредитов.", 409)
        connection.execute("UPDATE players SET credits = credits - ? WHERE id = ?", (price, player_id))
        connection.execute("INSERT INTO owned_vehicles(player_id, vehicle_id) VALUES (?, ?)", (player_id, vehicle["id"]))
        credits = connection.execute("SELECT credits FROM players WHERE id = ?", (player_id,)).fetchone()["credits"]
        connection.execute("COMMIT")
        return {"vehicleId": vehicle["id"], "credits": credits}
    except Exception:
        if connection.in_transaction:
            connection.execute("ROLLBACK")
        raise

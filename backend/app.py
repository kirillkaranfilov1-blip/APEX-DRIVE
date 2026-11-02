from contextlib import closing
from pathlib import Path

from flask import Flask, g, jsonify, request

from backend.config import DATABASE_PATH, DEFAULT_PLAYER_ID, TRACK_CATALOG, VEHICLE_CATALOG
from backend.database.connection import connect
from backend.database.initialize import initialize_database
from backend.services.catalog import read_catalog
from backend.services.economy import EconomyError, get_profile, purchase_vehicle


def create_app(database_path: str | Path | None = None) -> Flask:
    app = Flask(__name__)
    app.config["DATABASE_PATH"] = Path(database_path or DATABASE_PATH)
    initialize_database(app.config["DATABASE_PATH"])

    def db():
        if "connection" not in g:
            g.connection = connect(app.config["DATABASE_PATH"])
        return g.connection

    @app.teardown_appcontext
    def close_db(_error=None):
        connection = g.pop("connection", None)
        if connection is not None:
            connection.close()

    @app.after_request
    def local_dev_cors(response):
        origin = request.headers.get("Origin", "")
        if origin in {"http://localhost:5173", "http://127.0.0.1:5173"}:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
        return response

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "apex-drive-api"})

    @app.get("/api/profile")
    def profile():
        with closing(db().cursor()) as cursor:
            connection = cursor.connection
            result = get_profile(connection, DEFAULT_PLAYER_ID)
            connection.commit()
        return jsonify(result)

    @app.get("/api/catalog/vehicles")
    def vehicles():
        return jsonify(read_catalog(VEHICLE_CATALOG))

    @app.get("/api/catalog/tracks")
    def tracks():
        return jsonify(read_catalog(TRACK_CATALOG))

    @app.post("/api/vehicles/<vehicle_id>/purchase")
    def buy_vehicle(vehicle_id: str):
        catalog = read_catalog(VEHICLE_CATALOG)
        vehicle = next((item for item in catalog if item["id"] == vehicle_id), None)
        if vehicle is None:
            return jsonify({"error": {"code": "not_found", "message": "Автомобиль не найден."}}), 404
        connection = db()
        profile_data = get_profile(connection, DEFAULT_PLAYER_ID)
        connection.commit()
        try:
            result = purchase_vehicle(connection, player_id=DEFAULT_PLAYER_ID, vehicle=vehicle, owned_ids=set(profile_data["ownedVehicleIds"]))
            return jsonify(result), 201
        except EconomyError as error:
            return jsonify({"error": {"code": error.code, "message": str(error)}}), error.status

    @app.put("/api/profile/selected-vehicle")
    def select_vehicle():
        payload = request.get_json(silent=True)
        vehicle_id = payload.get("vehicleId") if isinstance(payload, dict) else None
        if not isinstance(vehicle_id, str) or not vehicle_id:
            return jsonify({"error": {"code": "invalid_request", "message": "Укажите vehicleId."}}), 400
        connection = db()
        profile_data = get_profile(connection, DEFAULT_PLAYER_ID)
        if vehicle_id not in profile_data["ownedVehicleIds"]:
            connection.commit()
            return jsonify({"error": {"code": "not_owned", "message": "Автомобиль не принадлежит игроку."}}), 403
        connection.execute("UPDATE players SET selected_vehicle_id = ? WHERE id = ?", (vehicle_id, DEFAULT_PLAYER_ID))
        connection.commit()
        return jsonify({"selectedVehicleId": vehicle_id})

    @app.errorhandler(500)
    def internal_error(_error):
        app.logger.exception("Внутренняя ошибка API")
        return jsonify({"error": {"code": "internal_error", "message": "Внутренняя ошибка API."}}), 500

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5000, debug=True)

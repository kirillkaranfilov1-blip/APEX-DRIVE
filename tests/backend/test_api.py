import json

from backend.app import create_app


def test_profile_starts_with_credit_balance_and_starter_vehicle(tmp_path):
    app = create_app(tmp_path / "profile.sqlite3")
    client = app.test_client()

    response = client.get("/api/profile")

    assert response.status_code == 200
    assert response.json["credits"] == 15000
    assert response.json["ownedVehicleIds"] == ["nightrun-club-sport"]
    assert response.json["careerStage"] == "ROOKIE"


def test_vehicle_catalog_uses_shared_vehicle_registry():
    app = create_app(":memory:")
    response = app.test_client().get("/api/catalog/vehicles")
    assert response.status_code == 200
    assert any(item["id"] == "nightrun-club-sport" for item in response.json)


def test_purchase_rejects_locked_car_without_changing_credits(tmp_path):
    app = create_app(tmp_path / "purchase.sqlite3")
    client = app.test_client()
    client.get("/api/profile")

    response = client.post("/api/vehicles/apex-vanta-r/purchase")
    profile = client.get("/api/profile")

    assert response.status_code == 403
    assert response.json["error"]["code"] == "locked"
    assert profile.json["credits"] == 15000
    assert "apex-vanta-r" not in profile.json["ownedVehicleIds"]


def test_purchase_uses_server_catalog_price_and_balance(tmp_path):
    app = create_app(tmp_path / "purchase-cheap-car.sqlite3")
    client = app.test_client()
    with client.application.app_context():
        from backend.database.connection import connect
        connection = connect(app.config["DATABASE_PATH"])
        connection.execute("INSERT INTO players(id, display_name, credits, reputation) VALUES ('local-player', 'Гонщик', 50000, 1200)")
        connection.execute("INSERT INTO owned_vehicles(player_id, vehicle_id) VALUES ('local-player', 'nightrun-club-sport')")
        connection.execute("INSERT INTO career_progress(player_id) VALUES ('local-player')")
        connection.execute("INSERT INTO player_settings(player_id) VALUES ('local-player')")
        connection.commit()
        connection.close()

    response = client.post("/api/vehicles/apex-sable-gt/purchase")
    profile = client.get("/api/profile")
    assert response.status_code == 201
    assert profile.json["credits"] == 11500
    assert "apex-sable-gt" in profile.json["ownedVehicleIds"]


def test_selected_vehicle_must_be_owned(tmp_path):
    app = create_app(tmp_path / "selection.sqlite3")
    client = app.test_client()
    client.get("/api/profile")

    response = client.put("/api/profile/selected-vehicle", json={"vehicleId": "apex-sable-gt"})
    assert response.status_code == 403
    assert response.json["error"]["code"] == "not_owned"

import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify /api/health endpoint returns ok status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "AgriGPT API"


def test_openapi_docs():
    """Verify OpenAPI specification is accessible."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert "paths" in spec
    assert "/api/health" in spec["paths"]
    assert "/api/farms" in spec["paths"]


def test_farm_crud():
    """Verify Farm creation, retrieval, and updating."""
    # 1. Create Farm
    payload = {
        "name": "Krishna Valley Farm",
        "location": "Pune, Maharashtra",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "total_area_acres": 15.0,
        "elevation_meters": 560.0,
        "climate_zone": "Tropical Wet-Dry",
    }
    create_res = client.post("/api/farms", json=payload)
    assert create_res.status_code == 201
    created_farm = create_res.json()
    assert created_farm["name"] == "Krishna Valley Farm"
    farm_id = created_farm["id"]

    # 2. Get Farm by ID
    get_res = client.get(f"/api/farms/{farm_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == farm_id

    # 3. List Farms
    list_res = client.get("/api/farms")
    assert list_res.status_code == 200
    assert any(f["id"] == farm_id for f in list_res.json())

    # 4. Update Farm
    update_res = client.put(f"/api/farms/{farm_id}", json={"total_area_acres": 18.5})
    assert update_res.status_code == 200
    assert update_res.json()["total_area_acres"] == 18.5


def test_field_and_crop_flow():
    """Verify creating a field and registering a crop."""
    # Create Field under demo farm
    field_payload = {
        "name": "East Terrace - Sector 3",
        "area_acres": 4.5,
        "soil_type": "Clay Loam",
        "irrigation_type": "Drip Irrigation",
    }
    field_res = client.post("/api/farms/farm-demo-01/fields", json=field_payload)
    assert field_res.status_code == 201
    field = field_res.json()
    field_id = field["id"]

    # Register crop
    crop_payload = {
        "crop_name": "Wheat",
        "variety": "Lokwan HD-2189",
        "sowing_date": "2026-10-01",
        "growth_stage": "Seedling",
        "target_yield_tons": 18.0,
    }
    crop_res = client.post(f"/api/fields/{field_id}/crops", json=crop_payload)
    assert crop_res.status_code == 201
    assert crop_res.json()["crop_name"] == "Wheat"


def test_soil_readings():
    """Verify recording and querying soil sensor telemetry."""
    soil_payload = {
        "moisture_percentage": 22.4,
        "temperature_celsius": 26.0,
        "ph_level": 6.7,
        "nitrogen_mg_kg": 130.0,
        "phosphorus_mg_kg": 28.0,
        "potassium_mg_kg": 165.0,
    }
    res = client.post("/api/fields/field-demo-01/soil", json=soil_payload)
    assert res.status_code == 201

    latest_res = client.get("/api/fields/field-demo-01/soil/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["moisture_percentage"] == 22.4


def test_weather_endpoint():
    """Verify weather endpoint returns real or fallback data structure."""
    res = client.get("/api/weather?location=Nashik")
    assert res.status_code == 200
    data = res.json()
    assert "current" in data
    assert "temperature_celsius" in data["current"]
    assert "humidity_percentage" in data["current"]


def test_advisor_chat():
    """Verify AI Advisor chat returns structured response."""
    payload = {
        "message": "When should I water my flowering tomatoes?",
        "farm_id": "farm-demo-01",
        "field_id": "field-demo-01",
    }
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "message" in data
    assert "recommendations" in data
    assert "risk_level" in data
    assert len(data["recommendations"]) > 0


def test_disease_scan_base64():
    """Verify disease scanner endpoint accepting image payload."""
    # 1x1 transparent png pixel in base64
    tiny_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    payload = {
        "image": tiny_b64,
        "crop": "Tomato",
        "description": "Yellow spots on leaf",
    }
    res = client.post("/api/disease/scan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "disease" in data
    assert "confidence" in data
    assert "recommendations" in data
    assert "severity" in data


def test_predictions_endpoint():
    """Verify prediction generation across stress vectors."""
    payload = {
        "field_id": "field-demo-01",
        "crop": "Tomato",
        "temperature": 36.5,
        "soil_moisture": 16.0,
        "rain_probability": 5.0,
    }
    res = client.post("/api/predictions", json=payload)
    assert res.status_code == 201
    preds = res.json()
    assert len(preds) > 0
    types = [p["prediction_type"] for p in preds]
    assert "WATER_STRESS" in types or "HEAT_STRESS" in types


def test_recommendations_and_early_warning():
    """Verify recommendation generation and trend early warning."""
    rec_res = client.get("/api/fields/field-demo-01/recommendations")
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) > 0

    warn_res = client.get("/api/fields/field-demo-01/early-warnings")
    assert warn_res.status_code == 200
    warnings = warn_res.json()
    assert isinstance(warnings, list)


def test_dashboard_endpoint():
    """Verify complete unified decision support dashboard."""
    res = client.get("/api/dashboard/farm-demo-01")
    assert res.status_code == 200
    dashboard = res.json()
    assert "farm" in dashboard
    assert "fields" in dashboard
    assert "weather" in dashboard
    assert "recommendations" in dashboard
    assert "data_quality" in dashboard
    assert dashboard["data_quality"]["overall_score"] > 0

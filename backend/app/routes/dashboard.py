from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status
from app.db.supabase import get_db
from app.services.weather_service import weather_service
from app.services.prediction_service import prediction_service
from app.services.recommendation_service import recommendation_service
from app.utils.helpers import assess_data_quality
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Farm Decision Dashboard"])


@router.get("/{farm_id}", response_model=DashboardResponse)
async def get_farm_dashboard(farm_id: str):
    """
    Unified multi-layered farm decision-support response.
    Orchestrates farm metadata, plots, current crops, live weather,
    latest soil sensors, predictive risks, and actionable recommendations.
    Resilient to missing data and reports transparent data quality indicators.
    """
    db = get_db()
    farm = await db.get_farm(farm_id)

    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Farm '{farm_id}' not found", "error_code": "FARM_NOT_FOUND"},
        )

    # 1. Fields & Crops
    fields = await db.get_fields_by_farm(farm_id)
    all_crops: List[Dict[str, Any]] = []
    latest_soil: Dict[str, Any] = {}
    primary_field_id = fields[0]["id"] if fields else None

    for f in fields:
        crops = await db.get_crops_by_field(f["id"])
        all_crops.extend(crops)

    if primary_field_id:
        soil = await db.get_latest_soil(primary_field_id)
        if soil:
            latest_soil = soil

    # 2. Live Weather
    lat = farm.get("latitude") or 19.9975
    lon = farm.get("longitude") or 73.7898
    weather = await weather_service.get_current_weather(
        float(lat), float(lon), farm.get("name", "Farm Location")
    )

    # 3. Predictions & Recommendations
    predictions: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    early_warnings: List[Dict[str, Any]] = []

    if primary_field_id:
        predictions = await prediction_service.generate_field_predictions(primary_field_id)
        recommendations = await recommendation_service.generate_recommendations(primary_field_id)
        early_warnings = await recommendation_service.detect_early_warnings(primary_field_id)

    # Extract high/moderate risks from predictions
    active_risks = [
        {
            "type": p.get("prediction_type"),
            "risk_level": p.get("risk_level"),
            "confidence": p.get("confidence"),
            "explanation": p.get("explanation"),
        }
        for p in predictions
        if p.get("risk_level") in ["HIGH", "CRITICAL", "MODERATE"]
    ]

    # 4. Assess Data Quality
    data_quality = assess_data_quality(
        has_soil=bool(latest_soil),
        has_weather=bool(weather and weather.get("current")),
        has_crop=bool(all_crops),
    )

    return {
        "farm": farm,
        "fields": fields,
        "crops": all_crops,
        "weather": weather.get("current", {}),
        "latest_soil": latest_soil or None,
        "risks": active_risks,
        "predictions": predictions,
        "recommendations": recommendations,
        "early_warnings": early_warnings,
        "data_quality": data_quality,
    }

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.supabase import get_db
from app.services.prediction_service import prediction_service
from app.schemas.prediction import PredictionRequest, PredictionResponse

router = APIRouter(tags=["Predictions"])


@router.post("/predictions", response_model=List[PredictionResponse], status_code=status.HTTP_201_CREATED)
async def generate_predictions(payload: PredictionRequest):
    """
    Run predictive models across agricultural stress vectors:
    WATER_STRESS, DISEASE_RISK, HEAT_STRESS, and CROP_HEALTH.
    """
    db = get_db()
    field = await db.get_field(payload.field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{payload.field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )

    overrides = {
        "crop": payload.crop,
        "growth_stage": payload.growth_stage,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "soil_moisture": payload.soil_moisture,
        "rain_prob": payload.rain_probability,
    }

    results = await prediction_service.generate_field_predictions(
        field_id=payload.field_id, override_features=overrides
    )
    return results


@router.get("/fields/{field_id}/predictions", response_model=List[PredictionResponse])
async def get_field_predictions(
    field_id: str,
    limit: int = Query(10, ge=1, le=50, description="Max predictions to retrieve"),
):
    """Retrieve logged predictions for a specific plot/field."""
    db = get_db()
    preds = await db.get_predictions(field_id, limit=limit)
    if not preds:
        # Run on-demand prediction if none logged yet
        preds = await prediction_service.generate_field_predictions(field_id)
    return preds

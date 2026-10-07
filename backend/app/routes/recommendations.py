from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.supabase import get_db
from app.services.recommendation_service import recommendation_service
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationGenerateRequest,
    EarlyWarningResponse,
)

router = APIRouter(prefix="/fields/{field_id}", tags=["Recommendations & Early Warnings"])


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def get_field_recommendations(
    field_id: str,
    limit: int = Query(10, ge=1, le=50, description="Max recommendations to retrieve"),
):
    """Retrieve active and recent recommendations for a field."""
    db = get_db()
    recs = await db.get_recommendations(field_id, limit=limit)
    if not recs:
        # Generate initial recommendations if none exist
        recs = await recommendation_service.generate_recommendations(field_id)
    return recs


@router.post("/recommendations/generate", response_model=List[RecommendationResponse])
async def trigger_recommendations_generation(
    field_id: str,
    payload: Optional[RecommendationGenerateRequest] = None,
):
    """
    Synthesize live sensor, weather, and crop factors to generate fresh explainable recommendations.
    """
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )

    overrides = payload.model_dump() if payload else {}
    results = await recommendation_service.generate_recommendations(field_id, override_data=overrides)
    return results


@router.get("/early-warnings", response_model=List[EarlyWarningResponse])
async def get_field_early_warnings(field_id: str):
    """
    Trend-based early warning system detecting adverse multi-day depletion
    (such as consecutive daily moisture drops indicating impending water stress).
    """
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )

    warnings = await recommendation_service.detect_early_warnings(field_id)
    return warnings

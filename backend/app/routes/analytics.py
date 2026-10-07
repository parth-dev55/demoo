from fastapi import APIRouter, HTTPException, status
from app.services.analytics_service import analytics_service
from app.schemas.analytics import AnalyticsResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/{farm_id}", response_model=AnalyticsResponse)
async def get_farm_analytics(farm_id: str):
    """
    Compute comprehensive agricultural analytics for a farm.
    Aggregates field area, crop yields, resource efficiency, and financial projections.
    Explicitly flags available=false if essential data is missing.
    """
    result = await analytics_service.get_farm_analytics(farm_id)
    return result

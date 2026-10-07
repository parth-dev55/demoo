from typing import List
from fastapi import APIRouter, HTTPException, Query, status
from app.db.supabase import get_db
from app.schemas.soil import SoilReadingCreate, SoilReadingResponse, SoilHistoryResponse

router = APIRouter(prefix="/fields/{field_id}/soil", tags=["Soil"])


@router.post("", response_model=SoilReadingResponse, status_code=status.HTTP_201_CREATED)
async def record_soil_reading(field_id: str, payload: SoilReadingCreate):
    """Ingest a new soil telemetry or lab sensor reading for a field."""
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )
    created = await db.record_soil(field_id, payload.model_dump())
    return created


@router.get("/latest", response_model=SoilReadingResponse)
async def get_latest_soil_reading(field_id: str):
    """Retrieve the most recent soil moisture, pH, and NPK metrics."""
    db = get_db()
    reading = await db.get_latest_soil(field_id)
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"No soil readings found for field '{field_id}'", "error_code": "NO_SOIL_DATA"},
        )
    return reading


@router.get("/history", response_model=SoilHistoryResponse)
async def get_soil_history(
    field_id: str,
    limit: int = Query(15, ge=1, le=100, description="Number of historical readings"),
):
    """Retrieve historical time series of soil readings for trend analysis."""
    db = get_db()
    readings = await db.get_soil_history(field_id, limit=limit)
    return {
        "field_id": field_id,
        "count": len(readings),
        "readings": readings,
    }

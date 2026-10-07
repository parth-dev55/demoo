from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.supabase import get_db
from app.schemas.crop import CropCreate, CropUpdate, CropResponse

router = APIRouter(tags=["Crops"])


@router.post("/fields/{field_id}/crops", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
async def create_crop_in_field(field_id: str, payload: CropCreate):
    """Register a new planted crop in a specific field."""
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )
    created = await db.create_crop(field_id, payload.model_dump())
    return created


@router.get("/fields/{field_id}/crops", response_model=List[CropResponse])
async def list_crops_in_field(field_id: str):
    """Retrieve all crops planted in a specific field."""
    db = get_db()
    crops = await db.get_crops_by_field(field_id)
    return crops


@router.put("/crops/{crop_id}", response_model=CropResponse)
async def update_crop(crop_id: str, payload: CropUpdate):
    """Update growth stage, actual yield, or status of a crop."""
    db = get_db()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = await db.update_crop(crop_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Crop '{crop_id}' not found", "error_code": "CROP_NOT_FOUND"},
        )
    return updated

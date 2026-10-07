from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.supabase import get_db
from app.schemas.field import FieldCreate, FieldResponse

# Router for field endpoints
router = APIRouter(tags=["Fields"])


@router.post("/farms/{farm_id}/fields", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field_for_farm(farm_id: str, payload: FieldCreate):
    """Add a new agricultural plot/field under a specified farm."""
    db = get_db()
    farm = await db.get_farm(farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Parent farm '{farm_id}' not found", "error_code": "FARM_NOT_FOUND"},
        )
    created = await db.create_field(farm_id, payload.model_dump())
    return created


@router.get("/farms/{farm_id}/fields", response_model=List[FieldResponse])
async def list_fields_for_farm(farm_id: str):
    """List all plots/fields belonging to a farm."""
    db = get_db()
    fields = await db.get_fields_by_farm(farm_id)
    return fields


@router.get("/fields/{field_id}", response_model=FieldResponse)
async def get_field(field_id: str):
    """Get details of a specific plot/field."""
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )
    return field

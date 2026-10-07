from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.supabase import get_db
from app.schemas.farm import FarmCreate, FarmUpdate, FarmResponse

router = APIRouter(prefix="/farms", tags=["Farms"])


@router.post("", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_farm(payload: FarmCreate):
    """Create a new registered farm."""
    db = get_db()
    data = payload.model_dump()
    created = await db.create_farm(data)
    return created


@router.get("", response_model=List[FarmResponse])
async def list_farms(user_id: Optional[str] = Query(None, description="Filter by user ID")):
    """List all farms, optionally filtered by owner user_id."""
    db = get_db()
    farms = await db.get_farms(user_id)
    return farms


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: str):
    """Fetch details of a single farm by its ID."""
    db = get_db()
    farm = await db.get_farm(farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Farm '{farm_id}' not found", "error_code": "FARM_NOT_FOUND"},
        )
    return farm


@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(farm_id: str, payload: FarmUpdate):
    """Update metadata for an existing farm."""
    db = get_db()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = await db.update_farm(farm_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Farm '{farm_id}' not found", "error_code": "FARM_NOT_FOUND"},
        )
    return updated


@router.delete("/{farm_id}", status_code=status.HTTP_200_OK)
async def delete_farm(farm_id: str):
    """Delete a farm and its associated resources."""
    db = get_db()
    deleted = await db.delete_farm(farm_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Farm '{farm_id}' not found", "error_code": "FARM_NOT_FOUND"},
        )
    return {"success": True, "message": f"Farm '{farm_id}' deleted successfully."}

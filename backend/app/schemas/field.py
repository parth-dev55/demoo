from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FieldBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, example="North Orchard - Plot A")
    area_acres: float = Field(..., gt=0.0, example=5.0)
    soil_type: Optional[str] = Field("Loamy", example="Black Cotton Soil")
    irrigation_type: Optional[str] = Field("Drip", example="Drip Irrigation")
    polygon_coordinates: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    area_acres: Optional[float] = Field(None, gt=0.0)
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    polygon_coordinates: Optional[List[Dict[str, Any]]] = None


class FieldResponse(FieldBase):
    id: str
    farm_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

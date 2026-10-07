from typing import Optional, List
from pydantic import BaseModel, Field


class SoilReadingCreate(BaseModel):
    moisture_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, example=28.5)
    temperature_celsius: Optional[float] = Field(None, ge=-10.0, le=60.0, example=24.0)
    ph_level: Optional[float] = Field(None, ge=0.0, le=14.0, example=6.8)
    nitrogen_mg_kg: Optional[float] = Field(None, ge=0.0, example=135.0)
    phosphorus_mg_kg: Optional[float] = Field(None, ge=0.0, example=30.0)
    potassium_mg_kg: Optional[float] = Field(None, ge=0.0, example=175.0)
    electrical_conductivity_ds_m: Optional[float] = Field(None, ge=0.0, example=1.2)
    organic_matter_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, example=2.5)
    sensor_id: Optional[str] = Field(None, example="SN-IOT-092")
    source: Optional[str] = Field("sensor", example="sensor")


class SoilReadingResponse(SoilReadingCreate):
    id: str
    field_id: str
    recorded_at: str

    class Config:
        from_attributes = True


class SoilHistoryResponse(BaseModel):
    field_id: str
    count: int
    readings: List[SoilReadingResponse]

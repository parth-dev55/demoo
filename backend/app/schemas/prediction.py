from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class PredictionType(str, Enum):
    WATER_STRESS = "WATER_STRESS"
    DISEASE_RISK = "DISEASE_RISK"
    HEAT_STRESS = "HEAT_STRESS"
    CROP_HEALTH = "CROP_HEALTH"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PredictionRequest(BaseModel):
    field_id: str = Field(..., example="field-demo-01")
    crop: Optional[str] = Field("Tomato", example="Tomato")
    growth_stage: Optional[str] = Field("Flowering", example="Flowering")
    temperature: Optional[float] = Field(None, example=34.0)
    humidity: Optional[float] = Field(None, example=45.0)
    soil_moisture: Optional[float] = Field(None, example=18.0)
    rain_probability: Optional[float] = Field(None, example=10.0)
    rainfall_mm: Optional[float] = Field(None, example=0.0)
    soil_ph: Optional[float] = Field(None, example=6.6)
    nitrogen: Optional[float] = Field(None, example=120.0)
    prediction_type: Optional[PredictionType] = None


class PredictionResponse(BaseModel):
    id: str
    field_id: str
    prediction_type: str
    risk_level: str
    confidence: float
    model_version: str
    explanation: str
    input_snapshot: Dict[str, Any]
    predicted_at: str
    forecast_horizon_days: int = 7

    class Config:
        from_attributes = True

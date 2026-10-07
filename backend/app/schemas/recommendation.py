from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RecommendationResponse(BaseModel):
    id: str
    field_id: str
    category: str = Field(..., example="IRRIGATION")  # IRRIGATION, FERTILIZATION, PEST_CONTROL, HARVEST
    priority: str = Field(..., example="HIGH")        # LOW, MEDIUM, HIGH, URGENT
    title: str = Field(..., example="Irrigation recommended")
    reason: str = Field(..., example="Soil moisture is low (18%) and rainfall probability is under 15%.")
    action_steps: List[str] = Field(default_factory=list)
    confidence: float = Field(..., example=0.85)
    status: str = Field("PENDING", example="PENDING")
    generated_at: str

    class Config:
        from_attributes = True


class RecommendationGenerateRequest(BaseModel):
    crop: Optional[str] = None
    growth_stage: Optional[str] = None
    soil_moisture: Optional[float] = None
    temperature: Optional[float] = None
    rain_probability: Optional[float] = None


class EarlyWarningResponse(BaseModel):
    warning_type: str
    severity: str
    message: str
    detected_trend: str
    data_points: List[float]

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DataQualityIndicator(BaseModel):
    soil: str = Field("AVAILABLE", example="AVAILABLE")      # AVAILABLE, MISSING, STALE
    weather: str = Field("AVAILABLE", example="AVAILABLE")
    crop: str = Field("AVAILABLE", example="AVAILABLE")
    overall_score: float = Field(0.90, example=0.90)


class DashboardResponse(BaseModel):
    farm: Dict[str, Any]
    fields: List[Dict[str, Any]]
    crops: List[Dict[str, Any]]
    weather: Dict[str, Any]
    latest_soil: Optional[Dict[str, Any]] = None
    risks: List[Dict[str, Any]] = Field(default_factory=list)
    predictions: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    early_warnings: List[Dict[str, Any]] = Field(default_factory=list)
    data_quality: DataQualityIndicator

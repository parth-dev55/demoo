from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DiseaseScanRequest(BaseModel):
    crop: Optional[str] = Field(None, example="Tomato")
    growth_stage: Optional[str] = Field(None, example="Flowering")
    location: Optional[str] = Field(None, example="Nashik, Maharashtra")
    description: Optional[str] = Field(None, example="Yellow concentric spots on lower leaves")
    language: Optional[str] = Field("en", example="en")


class DifferentialDiagnosis(BaseModel):
    disease: str
    likelihood: str


class DiseaseScanResponse(BaseModel):
    disease: str = Field(..., example="Early Blight (Alternaria solani)")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.87)
    confidence_level: str = Field("High", example="High")
    severity: str = Field("MODERATE", example="MODERATE")
    symptoms: List[str] = Field(default_factory=list)
    reasoning: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    prevention: List[str] = Field(default_factory=list)
    differential_diagnoses: List[DifferentialDiagnosis] = Field(default_factory=list)
    image_url: Optional[str] = None
    is_plant_image: bool = True
    needs_expert_confirmation: bool = True
    disclaimer: str = (
        "AI-generated decision support. Consult an agronomist before heavy chemical intervention."
    )

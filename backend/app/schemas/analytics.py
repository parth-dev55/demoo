from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AnalyticsResponse(BaseModel):
    available: bool = True
    reason: Optional[str] = None
    farm_id: str
    overview: Dict[str, Any] = Field(default_factory=dict)
    yield_trends: List[Dict[str, Any]] = Field(default_factory=list)
    resource_usage: Dict[str, Any] = Field(default_factory=dict)
    financials: Dict[str, Any] = Field(default_factory=dict)

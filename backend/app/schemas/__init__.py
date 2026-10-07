"""Pydantic request and response schemas for all AgriGPT domains."""
from .farm import FarmCreate, FarmUpdate, FarmResponse
from .field import FieldCreate, FieldUpdate, FieldResponse
from .crop import CropCreate, CropUpdate, CropResponse
from .soil import SoilReadingCreate, SoilReadingResponse, SoilHistoryResponse
from .weather import WeatherResponse, WeatherForecastResponse
from .chat import ChatRequest, ChatResponse, ChatSessionResponse, ChatMessageResponse
from .disease import DiseaseScanRequest, DiseaseScanResponse
from .prediction import PredictionRequest, PredictionResponse, PredictionType, RiskLevel
from .recommendation import RecommendationResponse, RecommendationGenerateRequest, EarlyWarningResponse
from .analytics import AnalyticsResponse
from .dashboard import DashboardResponse, DataQualityIndicator

__all__ = [
    "FarmCreate", "FarmUpdate", "FarmResponse",
    "FieldCreate", "FieldUpdate", "FieldResponse",
    "CropCreate", "CropUpdate", "CropResponse",
    "SoilReadingCreate", "SoilReadingResponse", "SoilHistoryResponse",
    "WeatherResponse", "WeatherForecastResponse",
    "ChatRequest", "ChatResponse", "ChatSessionResponse", "ChatMessageResponse",
    "DiseaseScanRequest", "DiseaseScanResponse",
    "PredictionRequest", "PredictionResponse", "PredictionType", "RiskLevel",
    "RecommendationResponse", "RecommendationGenerateRequest", "EarlyWarningResponse",
    "AnalyticsResponse",
    "DashboardResponse", "DataQualityIndicator",
]

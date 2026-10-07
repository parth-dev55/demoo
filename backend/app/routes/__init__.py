"""FastAPI Router Registrations."""
from .farms import router as farms_router
from .fields import router as fields_router
from .crops import router as crops_router
from .soil import router as soil_router
from .weather import router as weather_router
from .chat import router as chat_router
from .disease import router as disease_router
from .predictions import router as predictions_router
from .recommendations import router as recommendations_router
from .analytics import router as analytics_router
from .dashboard import router as dashboard_router

__all__ = [
    "farms_router",
    "fields_router",
    "crops_router",
    "soil_router",
    "weather_router",
    "chat_router",
    "disease_router",
    "predictions_router",
    "recommendations_router",
    "analytics_router",
    "dashboard_router",
]

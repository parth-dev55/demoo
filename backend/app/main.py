import logging
import os
import sys

# Ensure backend root is on Python module search path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.routes import (
    farms_router,
    fields_router,
    crops_router,
    soil_router,
    weather_router,
    chat_router,
    disease_router,
    predictions_router,
    recommendations_router,
    analytics_router,
    dashboard_router,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agrigpt")

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-structured AI Agriculture Decision Support Platform API.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- EXCEPTION HANDLERS FOR CONSISTENT ERROR RESPONSES ---
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(detail),
            "error_code": f"HTTP_{exc.status_code}",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = f"Validation error at '{first_error.get('loc', ['body'])[-1]}': {first_error.get('msg', 'Invalid input')}"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": msg,
            "error_code": "VALIDATION_ERROR",
            "details": errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )


# --- HEALTH CHECK ENDPOINT ---
@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    """Service health verification endpoint."""
    return {
        "status": "ok",
        "service": "AgriGPT API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


# --- REGISTER ALL ROUTERS UNDER /api PREFIX ---
api_prefix = settings.API_PREFIX

app.include_router(farms_router, prefix=api_prefix)
app.include_router(fields_router, prefix=api_prefix)
app.include_router(crops_router, prefix=api_prefix)
app.include_router(soil_router, prefix=api_prefix)
app.include_router(weather_router, prefix=api_prefix)
app.include_router(chat_router, prefix=api_prefix)
app.include_router(disease_router, prefix=api_prefix)
app.include_router(predictions_router, prefix=api_prefix)
app.include_router(recommendations_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)

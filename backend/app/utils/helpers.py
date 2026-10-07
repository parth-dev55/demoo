from typing import Any, Dict, Optional
from fastapi import HTTPException
from fastapi.responses import JSONResponse


def format_error(message: str, error_code: str = "BAD_REQUEST", status_code: int = 400) -> JSONResponse:
    """Standardized error JSON response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "error_code": error_code,
        },
    )


def assess_data_quality(has_soil: bool, has_weather: bool, has_crop: bool) -> Dict[str, Any]:
    """Calculate data completeness score and quality status indicators."""
    total = 3
    present = sum([1 for x in [has_soil, has_weather, has_crop] if x])
    score = round(present / total, 2)

    return {
        "soil": "AVAILABLE" if has_soil else "MISSING",
        "weather": "AVAILABLE" if has_weather else "MISSING",
        "crop": "AVAILABLE" if has_crop else "MISSING",
        "overall_score": score,
    }

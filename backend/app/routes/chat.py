import uuid
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.db.supabase import get_db
from app.services.ai_service import ai_service
from app.services.weather_service import weather_service
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["AI Advisor Chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_advisor(payload: ChatRequest):
    """
    Unified AI Copilot consultation endpoint.
    Retrieves farm, crop, soil, and weather context from Supabase,
    and returns a structured farmer-friendly response.
    """
    db = get_db()
    session_id = payload.session_id or f"session-{uuid.uuid4().hex[:8]}"

    # 1. Assemble structured farm context from Supabase
    farm_context: Dict[str, Any] = {}

    if payload.farm_id:
        farm = await db.get_farm(payload.farm_id)
        if farm:
            farm_context["farm_name"] = farm.get("name")
            farm_context["location"] = farm.get("location")

            # Fetch weather if coordinates available
            if farm.get("latitude") and farm.get("longitude"):
                try:
                    w = await weather_service.get_current_weather(
                        float(farm["latitude"]), float(farm["longitude"])
                    )
                    curr = w.get("current", {})
                    farm_context["temperature"] = curr.get("temperature_celsius")
                    farm_context["humidity"] = curr.get("humidity_percentage")
                    farm_context["rain_prob"] = 15.0
                except Exception:
                    pass

    if payload.field_id:
        field = await db.get_field(payload.field_id)
        if field:
            farm_context["field_name"] = field.get("name")
            crops = await db.get_crops_by_field(payload.field_id)
            if crops:
                active_crop = crops[0]
                farm_context["crop_name"] = active_crop.get("crop_name")
                farm_context["variety"] = active_crop.get("variety")
                farm_context["growth_stage"] = active_crop.get("growth_stage")

            latest_soil = await db.get_latest_soil(payload.field_id)
            if latest_soil:
                farm_context["soil_moisture"] = latest_soil.get("moisture_percentage")
                farm_context["soil_ph"] = latest_soil.get("ph_level")

    # 2. Invoke AI Service
    ai_result = await ai_service.generate_response(
        farmer_question=payload.message,
        farm_context=farm_context,
        language=payload.language or "en",
    )

    return {
        "message": ai_result["message"],
        "session_id": session_id,
        "recommendations": ai_result.get("recommendations", []),
        "risk_level": ai_result.get("risk_level", "LOW"),
        "context_used": farm_context,
    }

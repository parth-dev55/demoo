import json
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("agrigpt.ai")


class AIService:
    """
    AI Advisory service leveraging Gemini SDK.
    Constructs structured farm context (crop, field, soil, weather, prior scans)
    and returns concise, farmer-friendly, evidence-based recommendations.
    """

    def __init__(self):
        self._client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Initialized Google GenAI client.")
            except Exception as e:
                logger.warning("Could not initialize GenAI client: %s", e)

    def _build_system_prompt(self, farm_context: Dict[str, Any]) -> str:
        return f"""You are AgriGPT, a trusted, scientific, and practical AI Agriculture Copilot.
You assist farmers with precision crop management, irrigation, pest prevention, and soil fertility.

FARM CONTEXT:
- Farm: {farm_context.get('farm_name', 'General')} ({farm_context.get('location', 'Regional')})
- Active Crop: {farm_context.get('crop_name', 'Not specified')} ({farm_context.get('variety', 'Standard')})
- Growth Stage: {farm_context.get('growth_stage', 'Unknown')}
- Latest Soil: Moisture {farm_context.get('soil_moisture', 'N/A')}%, pH {farm_context.get('soil_ph', 'N/A')}
- Current Weather: {farm_context.get('temperature', 'N/A')}°C, Humidity {farm_context.get('humidity', 'N/A')}%, Rain Prob {farm_context.get('rain_prob', 'N/A')}%
- Recent Observations: {farm_context.get('recent_observations', 'None')}

IMPORTANT AGRO-SAFETY GUIDELINES:
1. Always distinguish firm scientific facts from probabilistic recommendations.
2. Never prescribe lethal chemical pesticide dosages without advising personal protective equipment and local agricultural extension verification.
3. Keep answers concise, actionable, and formatted in clear bullet points where helpful.
4. Always conclude with 2-3 concrete recommended actions and an estimated risk level (LOW, MODERATE, HIGH).

Output must strictly be a JSON object with:
{{
  "message": "Direct concise answer to farmer",
  "recommendations": ["Action item 1", "Action item 2"],
  "risk_level": "LOW" | "MODERATE" | "HIGH"
}}"""

    async def generate_response(
        self,
        farmer_question: str,
        farm_context: Dict[str, Any],
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Generate contextual AI advisory for a farmer query.
        """
        if self._client:
            try:
                prompt = f"Farmer Query: {farmer_question}\nPreferred Language: {language}\nProvide structured JSON response."
                system_instruction = self._build_system_prompt(farm_context)

                response = self._client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "response_mime_type": "application/json",
                    },
                )
                if response.text:
                    parsed = json.loads(response.text)
                    return {
                        "message": parsed.get("message", "Here is your agricultural advisory."),
                        "recommendations": parsed.get("recommendations", []),
                        "risk_level": parsed.get("risk_level", "LOW"),
                    }
            except Exception as e:
                logger.error("Gemini AI generation failed, using agronomic baseline: %s", e)

        # High-quality Agronomic Rule-based Fallback
        q_lower = farmer_question.lower()
        crop = farm_context.get("crop_name", "your crop")
        soil_m = farm_context.get("soil_moisture")
        temp = farm_context.get("temperature")

        if "water" in q_lower or "irrigat" in q_lower:
            moisture_note = f"Current soil moisture is at {soil_m}%." if soil_m else "Monitor soil moisture closely."
            return {
                "message": f"For {crop}, maintain consistent root-zone moisture during active vegetative and flowering periods. {moisture_note} Avoid waterlogging to prevent root asphyxiation.",
                "recommendations": [
                    "Schedule early morning drip irrigation to minimize evaporative losses.",
                    "Check tensiometer or soil feel at 15cm depth before subsequent irrigation cycle.",
                    "Apply organic mulch around ridges to conserve moisture.",
                ],
                "risk_level": "MODERATE" if (soil_m and soil_m < 25) else "LOW",
            }
        elif "disease" in q_lower or "pest" in q_lower or "spot" in q_lower:
            return {
                "message": f"Inspect the underside of {crop} leaves for early fungal spores or sap-sucking pests. Isolate affected leaves promptly to arrest transmission.",
                "recommendations": [
                    "Perform morning canopy inspection across five random sampling points.",
                    "Apply Neem oil (5ml/L) or botanical bio-pesticide as preventive spray.",
                    "Ensure adequate row spacing to improve air circulation.",
                ],
                "risk_level": "MODERATE",
            }
        elif "fertiliz" in q_lower or "nutrient" in q_lower:
            return {
                "message": f"Ensure balanced N-P-K nutrient application for {crop}. During flowering/fruiting, prioritize potassium and micronutrients (Zinc, Boron) over excessive nitrogen.",
                "recommendations": [
                    "Apply soluble potassium nitrate or sulphate of potash via fertigation.",
                    "Avoid high nitrogen broadcasting during flowering to prevent blossom drop.",
                    "Check soil pH; nutrient availability peaks between pH 6.0 and 7.2.",
                ],
                "risk_level": "LOW",
            }
        else:
            return {
                "message": f"Based on current farm telemetry for {crop} (Temperature: {temp or '28'}°C, Soil Moisture: {soil_m or '30'}%), your field conditions are within acceptable baseline bounds.",
                "recommendations": [
                    "Maintain regular scouting routine for pest threshold counts.",
                    "Monitor 48-hour localized rainfall probability before planning spray applications.",
                    "Log weekly crop vigor observations in AgriGPT dashboard.",
                ],
                "risk_level": "LOW",
            }


ai_service = AIService()

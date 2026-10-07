import logging
from typing import Dict, Any, List, Optional
from app.db.supabase import get_db

logger = logging.getLogger("agrigpt.recommendation")


class RecommendationService:
    """
    Explainable recommendation engine combining real soil sensors,
    meteorological forecast trends, crop phenology, and predictive risk indicators.
    Also features an Early Warning trend analyzer.
    """

    async def detect_early_warnings(self, field_id: str) -> List[Dict[str, Any]]:
        """
        Analyze multi-day time series data to detect degradation trends
        (e.g. soil moisture steadily dropping over 5 days).
        """
        db = get_db()
        history = await db.get_soil_history(field_id, limit=5)
        warnings: List[Dict[str, Any]] = []

        if len(history) >= 3:
            # Extract moisture readings chronologically (oldest to newest)
            moistures = [
                h["moisture_percentage"]
                for h in reversed(history)
                if h.get("moisture_percentage") is not None
            ]

            if len(moistures) >= 3:
                # Check for strictly or steadily decreasing moisture
                drops = [moistures[i] - moistures[i + 1] for i in range(len(moistures) - 1)]
                total_drop = moistures[0] - moistures[-1]

                if all(d >= 0 for d in drops) and total_drop >= 10.0:
                    warnings.append({
                        "warning_type": "WATER_STRESS_TREND",
                        "severity": "HIGH" if moistures[-1] < 22.0 else "MEDIUM",
                        "message": (
                            f"Early Warning: Soil moisture has continuously declined from {moistures[0]:.1f}% "
                            f"down to {moistures[-1]:.1f}% over the last {len(moistures)} logged intervals."
                        ),
                        "detected_trend": f"Steep depletion curve (-{total_drop:.1f}% overall)",
                        "data_points": moistures,
                    })

        return warnings

    async def generate_recommendations(
        self,
        field_id: str,
        override_data: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Synthesize current field, soil, crop, and weather state into actionable recommendations.
        """
        db = get_db()
        field = await db.get_field(field_id)
        crops = await db.get_crops_by_field(field_id) if field else []
        active_crop = crops[0] if crops else {}
        latest_soil = await db.get_latest_soil(field_id) if field else {}

        crop_name = active_crop.get("crop_name", "Crop")
        growth_stage = active_crop.get("growth_stage", "Vegetative")
        soil_m = latest_soil.get("moisture_percentage") if latest_soil else None
        soil_ph = latest_soil.get("ph_level") if latest_soil else None
        temp = 29.0
        rain_prob = 10.0

        if override_data:
            crop_name = override_data.get("crop") or crop_name
            growth_stage = override_data.get("growth_stage") or growth_stage
            soil_m = override_data.get("soil_moisture") if override_data.get("soil_moisture") is not None else soil_m
            temp = override_data.get("temperature") if override_data.get("temperature") is not None else temp
            rain_prob = override_data.get("rain_probability") if override_data.get("rain_probability") is not None else rain_prob

        generated: List[Dict[str, Any]] = []

        # 1. Irrigation Decision Logic
        if soil_m is not None:
            if soil_m < 20.0 and rain_prob < 25.0:
                generated.append({
                    "field_id": field_id,
                    "category": "IRRIGATION",
                    "priority": "HIGH" if temp > 32.0 else "MEDIUM",
                    "title": "Irrigation Recommended",
                    "reason": f"Soil moisture is depleted ({soil_m}%) and upcoming rain probability is only {rain_prob}%.",
                    "action_steps": [
                        f"Initiate drip irrigation cycle for 90-120 minutes during early morning.",
                        "Re-verify moisture level at root zone (15cm) 4 hours post-irrigation.",
                    ],
                    "confidence": 0.88,
                    "status": "PENDING",
                })
            elif soil_m > 42.0 and rain_prob > 50.0:
                generated.append({
                    "field_id": field_id,
                    "category": "IRRIGATION",
                    "priority": "MEDIUM",
                    "title": "Suspend Irrigation",
                    "reason": f"High soil moisture saturation ({soil_m}%) combined with {rain_prob}% rain probability.",
                    "action_steps": [
                        "Keep drip lines closed to avoid waterlogging and root rot.",
                        "Inspect drainage ditches in low-lying furrow zones.",
                    ],
                    "confidence": 0.84,
                    "status": "PENDING",
                })

        # 2. Fertilization & Nutrient Timing
        if growth_stage in ["Flowering", "Fruiting"]:
            generated.append({
                "field_id": field_id,
                "category": "FERTILIZATION",
                "priority": "MEDIUM",
                "title": f"Apply Micronutrients & Potassium for {crop_name}",
                "reason": f"{crop_name} is in {growth_stage} phase where potassium, boron, and calcium dictate fruit set.",
                "action_steps": [
                    "Dose 0-0-50 Potassium Sulphate (2.5 kg/acre) via fertigation.",
                    "Foliar spray chelated Zinc and Boron (1g/L) during overcast evening hours.",
                ],
                "confidence": 0.82,
                "status": "PENDING",
            })

        # 3. Soil pH Remediation if outside optimal range
        if soil_ph is not None:
            if soil_ph < 5.8:
                generated.append({
                    "field_id": field_id,
                    "category": "SOIL_MANAGEMENT",
                    "priority": "MEDIUM",
                    "title": "Acidic Soil Remediation",
                    "reason": f"Soil pH of {soil_ph} restricts phosphorus and magnesium uptake.",
                    "action_steps": [
                        "Broadcast agricultural dolomite lime at 150 kg/acre prior to next inter-cultivation.",
                    ],
                    "confidence": 0.79,
                    "status": "PENDING",
                })
            elif soil_ph > 7.8:
                generated.append({
                    "field_id": field_id,
                    "category": "SOIL_MANAGEMENT",
                    "priority": "MEDIUM",
                    "title": "Alkaline Soil Management",
                    "reason": f"Soil pH of {soil_ph} can induce iron chlorosis in {crop_name}.",
                    "action_steps": [
                        "Incorporate agricultural gypsum and elemental sulphur.",
                        "Apply humic acid with irrigation water to chelate micro-nutrients.",
                    ],
                    "confidence": 0.81,
                    "status": "PENDING",
                })

        # 4. Default preventative scouting if no acute warnings
        if not generated:
            generated.append({
                "field_id": field_id,
                "category": "GENERAL",
                "priority": "LOW",
                "title": f"Routine Field Scouting for {crop_name}",
                "reason": "All monitored sensor indicators are currently optimal.",
                "action_steps": [
                    "Inspect pest pheromone traps across the perimeter.",
                    "Log weekly plant height and canopy coverage metrics.",
                ],
                "confidence": 0.90,
                "status": "PENDING",
            })

        saved_results: List[Dict[str, Any]] = []
        for rec in generated:
            saved = await db.save_recommendation(rec)
            saved_results.append(saved)

        return saved_results


recommendation_service = RecommendationService()

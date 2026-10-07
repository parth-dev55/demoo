import logging
from typing import Dict, Any, List, Optional
from app.db.supabase import get_db

logger = logging.getLogger("agrigpt.prediction")


class PredictionModelInterface:
    """Standard interface for Agricultural Predictive Models."""

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class RuleBasedBaselineModel(PredictionModelInterface):
    """
    Explainable, deterministic baseline agricultural stress model.
    Evaluates agronomic thresholds across soil, thermal, atmospheric, and crop phenology variables.
    """

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        soil_moisture = features.get("soil_moisture")
        temperature = features.get("temperature")
        humidity = features.get("humidity")
        rain_prob = features.get("rain_prob", 0.0)
        crop = features.get("crop", "General Crop")
        growth_stage = features.get("growth_stage", "Vegetative")

        predictions: List[Dict[str, Any]] = []

        # 1. Water Stress Evaluation
        if soil_moisture is not None:
            if soil_moisture < 20.0 and (rain_prob < 20.0 or rain_prob is None):
                risk = "HIGH" if (temperature and temperature > 32.0) else "MODERATE"
                predictions.append({
                    "prediction_type": "WATER_STRESS",
                    "risk_level": risk,
                    "confidence": 0.88 if (temperature and rain_prob is not None) else 0.72,
                    "explanation": f"Soil moisture is critically low ({soil_moisture}%) with low precipitation outlook ({rain_prob}%). {crop} is at risk of stomatal closure and wilting.",
                })
            elif soil_moisture > 45.0 and (rain_prob > 60.0):
                predictions.append({
                    "prediction_type": "WATER_STRESS",
                    "risk_level": "MODERATE",
                    "confidence": 0.81,
                    "explanation": f"Excess soil saturation ({soil_moisture}%) combined with incoming rain forecast risks root hypoxia and damping-off.",
                })

        # 2. Heat Stress Evaluation
        if temperature is not None:
            if temperature >= 35.0:
                predictions.append({
                    "prediction_type": "HEAT_STRESS",
                    "risk_level": "HIGH" if temperature >= 38.0 else "MODERATE",
                    "confidence": 0.90,
                    "explanation": f"High ambient temperature ({temperature}°C) during {growth_stage} phase can cause pollen sterility and blossom drop in {crop}.",
                })

        # 3. Disease Risk (Fungal / Bacterial)
        if humidity is not None and temperature is not None:
            if humidity >= 75.0 and (20.0 <= temperature <= 30.0):
                predictions.append({
                    "prediction_type": "DISEASE_RISK",
                    "risk_level": "HIGH",
                    "confidence": 0.85,
                    "explanation": f"Warm temperatures ({temperature}°C) paired with high relative humidity ({humidity}%) create an ideal microclimate for foliar fungal and bacterial spore germination.",
                })
            elif humidity >= 65.0:
                predictions.append({
                    "prediction_type": "DISEASE_RISK",
                    "risk_level": "MODERATE",
                    "confidence": 0.74,
                    "explanation": f"Moderate-high humidity ({humidity}%) suggests monitoring lower canopy leaves for mildew or blight lesions.",
                })

        # 4. Overall Crop Health Index
        if not predictions:
            predictions.append({
                "prediction_type": "CROP_HEALTH",
                "risk_level": "LOW",
                "confidence": 0.92,
                "explanation": f"Environmental and soil parameters for {crop} are within optimal agronomic tolerances. No acute physiological stressors detected.",
            })

        return {"predictions": predictions, "model_version": "rule-baseline-v1.0"}


class FutureMLModelStub(PredictionModelInterface):
    """
    Plug-in stub for trained XGBoost / Random Forest / Neural Network model.
    """

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        # Placeholder for serialized ONNX / Pickle model inference
        baseline = RuleBasedBaselineModel()
        result = baseline.predict(features)
        result["model_version"] = "ml-stub-v1.0"
        return result


class PredictionService:
    """Service orchestrating feature assembly, prediction execution, and persistence."""

    def __init__(self):
        self.model: PredictionModelInterface = RuleBasedBaselineModel()

    async def generate_field_predictions(
        self,
        field_id: str,
        override_features: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        db = get_db()
        features: Dict[str, Any] = {}

        # 1. Fetch field and crop data
        field = await db.get_field(field_id)
        if field:
            crops = await db.get_crops_by_field(field_id)
            active_crop = crops[0] if crops else None
            features["crop"] = active_crop.get("crop_name", "Crop") if active_crop else "Crop"
            features["growth_stage"] = active_crop.get("growth_stage", "Vegetative") if active_crop else "Vegetative"

        # 2. Fetch latest soil reading
        latest_soil = await db.get_latest_soil(field_id)
        if latest_soil:
            features["soil_moisture"] = latest_soil.get("moisture_percentage")
            features["soil_temperature"] = latest_soil.get("temperature_celsius")
            features["soil_ph"] = latest_soil.get("ph_level")
            features["nitrogen"] = latest_soil.get("nitrogen_mg_kg")

        # 3. Apply overrides if provided
        if override_features:
            features.update({k: v for k, v in override_features.items() if v is not None})

        # Set sensible weather defaults if missing
        if "temperature" not in features:
            features["temperature"] = 28.5
        if "humidity" not in features:
            features["humidity"] = 55.0

        # Execute model
        inference = self.model.predict(features)
        raw_predictions = inference.get("predictions", [])
        saved_list: List[Dict[str, Any]] = []

        for p in raw_predictions:
            record = {
                "field_id": field_id,
                "crop_id": None,
                "prediction_type": p["prediction_type"],
                "risk_level": p["risk_level"],
                "confidence": p["confidence"],
                "model_version": inference["model_version"],
                "input_snapshot": features,
                "explanation": p["explanation"],
                "forecast_horizon_days": 7,
            }
            saved = await db.save_prediction(record)
            saved_list.append(saved)

        return saved_list


prediction_service = PredictionService()

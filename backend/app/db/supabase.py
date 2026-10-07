import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("agrigpt.db")

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Initialize or return singleton Supabase client using environment variables.
    Returns None if SUPABASE_URL or SUPABASE_KEY are not configured.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Connected successfully to Supabase: %s", settings.SUPABASE_URL)
            return _supabase_client
        except Exception as e:
            logger.error("Failed to initialize Supabase client: %s", e)
            return None
    else:
        logger.warning(
            "SUPABASE_URL or SUPABASE_KEY missing. Operating in in-memory simulation mode."
        )
        return None


class InMemoryStore:
    """
    In-memory fallback store matching the PostgreSQL/Supabase schema entities.
    Ensures that the backend functions immediately out-of-the-box in local hackathon mode
    even prior to provisioning a live Supabase project.
    """

    def __init__(self):
        self.farms: Dict[str, Dict[str, Any]] = {}
        self.fields: Dict[str, Dict[str, Any]] = {}
        self.crops: Dict[str, Dict[str, Any]] = {}
        self.soil_readings: Dict[str, Dict[str, Any]] = {}
        self.weather_readings: Dict[str, Dict[str, Any]] = {}
        self.disease_scans: Dict[str, Dict[str, Any]] = {}
        self.chat_sessions: Dict[str, Dict[str, Any]] = {}
        self.chat_messages: Dict[str, Dict[str, Any]] = {}
        self.predictions: Dict[str, Dict[str, Any]] = {}
        self.recommendations: Dict[str, Dict[str, Any]] = {}
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.transactions: Dict[str, Dict[str, Any]] = {}

        self._seed_default_data()

    def _seed_default_data(self):
        """Seed a baseline demo farm, fields, crops, and soil data."""
        farm_id = "farm-demo-01"
        now_iso = datetime.now(timezone.utc).isoformat()

        self.farms[farm_id] = {
            "id": farm_id,
            "user_id": "usr-demo-01",
            "name": "Sahyadri Bio-Farms",
            "location": "Nashik, Maharashtra",
            "latitude": 19.9975,
            "longitude": 73.7898,
            "total_area_acres": 12.5,
            "elevation_meters": 560.0,
            "climate_zone": "Semi-Arid Tropical",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        field_1_id = "field-demo-01"
        self.fields[field_1_id] = {
            "id": field_1_id,
            "farm_id": farm_id,
            "name": "North Orchard - Plot A",
            "area_acres": 5.0,
            "soil_type": "Black Cotton Soil",
            "irrigation_type": "Drip Irrigation",
            "polygon_coordinates": [
                {"lat": 19.998, "lng": 73.789},
                {"lat": 19.999, "lng": 73.791},
            ],
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        field_2_id = "field-demo-02"
        self.fields[field_2_id] = {
            "id": field_2_id,
            "farm_id": farm_id,
            "name": "South Terrace - Plot B",
            "area_acres": 7.5,
            "soil_type": "Loamy Red",
            "irrigation_type": "Sprinkler",
            "polygon_coordinates": [],
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        crop_1_id = "crop-demo-01"
        self.crops[crop_1_id] = {
            "id": crop_1_id,
            "field_id": field_1_id,
            "crop_name": "Tomato",
            "variety": "Abhinav F1 Hybrid",
            "sowing_date": "2026-08-15",
            "expected_harvest_date": "2026-11-20",
            "growth_stage": "Flowering",
            "target_yield_tons": 24.0,
            "actual_yield_tons": None,
            "status": "Active",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # Seed recent 5-day soil readings showing moisture trend
        for i, (m, temp, ph, n, p, k) in enumerate([
            (38.0, 26.5, 6.8, 140.0, 32.0, 180.0),
            (34.0, 27.0, 6.8, 138.0, 31.0, 178.0),
            (29.0, 28.2, 6.7, 135.0, 30.0, 175.0),
            (24.0, 29.0, 6.7, 132.0, 30.0, 172.0),
            (19.0, 30.5, 6.6, 128.0, 29.0, 170.0),
        ]):
            s_id = f"soil-demo-{i+1}"
            self.soil_readings[s_id] = {
                "id": s_id,
                "field_id": field_1_id,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "moisture_percentage": m,
                "temperature_celsius": temp,
                "ph_level": ph,
                "nitrogen_mg_kg": n,
                "phosphorus_mg_kg": p,
                "potassium_mg_kg": k,
                "electrical_conductivity_ds_m": 1.2,
                "organic_matter_percentage": 2.4,
                "sensor_id": "SN-IOT-092",
                "source": "sensor",
            }


class SupabaseDB:
    """
    Unified database access layer that delegates to live Supabase client when configured,
    or gracefully falls back to the in-memory persistence store.
    """

    def __init__(self):
        self.client: Optional[Client] = get_supabase_client()
        self.local: InMemoryStore = InMemoryStore()

    @property
    def is_live(self) -> bool:
        return self.client is not None

    # --- FARMS ---
    async def get_farms(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                query = self.client.table("farms").select("*")
                if user_id:
                    query = query.eq("user_id", user_id)
                res = query.execute()
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_farms error: %s", e)
        return list(self.local.farms.values())

    async def get_farm(self, farm_id: str) -> Optional[Dict[str, Any]]:
        if self.is_live:
            try:
                res = self.client.table("farms").select("*").eq("id", farm_id).single().execute()
                return res.data
            except Exception as e:
                logger.error("Supabase get_farm error: %s", e)
        return self.local.farms.get(farm_id)

    async def create_farm(self, data: Dict[str, Any]) -> Dict[str, Any]:
        farm_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": farm_id, "created_at": now, "updated_at": now}

        if self.is_live:
            try:
                res = self.client.table("farms").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase create_farm error: %s", e)

        self.local.farms[farm_id] = record
        return record

    async def update_farm(self, farm_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        if self.is_live:
            try:
                res = self.client.table("farms").update({**updates, "updated_at": now}).eq("id", farm_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase update_farm error: %s", e)

        if farm_id in self.local.farms:
            self.local.farms[farm_id].update({**updates, "updated_at": now})
            return self.local.farms[farm_id]
        return None

    async def delete_farm(self, farm_id: str) -> bool:
        if self.is_live:
            try:
                self.client.table("farms").delete().eq("id", farm_id).execute()
                return True
            except Exception as e:
                logger.error("Supabase delete_farm error: %s", e)

        if farm_id in self.local.farms:
            del self.local.farms[farm_id]
            return True
        return False

    # --- FIELDS ---
    async def get_fields_by_farm(self, farm_id: str) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                res = self.client.table("fields").select("*").eq("farm_id", farm_id).execute()
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_fields_by_farm error: %s", e)

        return [f for f in self.local.fields.values() if f.get("farm_id") == farm_id]

    async def get_field(self, field_id: str) -> Optional[Dict[str, Any]]:
        if self.is_live:
            try:
                res = self.client.table("fields").select("*").eq("id", field_id).single().execute()
                return res.data
            except Exception as e:
                logger.error("Supabase get_field error: %s", e)
        return self.local.fields.get(field_id)

    async def create_field(self, farm_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        field_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": field_id, "farm_id": farm_id, "created_at": now, "updated_at": now}

        if self.is_live:
            try:
                res = self.client.table("fields").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase create_field error: %s", e)

        self.local.fields[field_id] = record
        return record

    # --- CROPS ---
    async def get_crops_by_field(self, field_id: str) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                res = self.client.table("crops").select("*").eq("field_id", field_id).execute()
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_crops error: %s", e)
        return [c for c in self.local.crops.values() if c.get("field_id") == field_id]

    async def create_crop(self, field_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        crop_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": crop_id, "field_id": field_id, "created_at": now, "updated_at": now}

        if self.is_live:
            try:
                res = self.client.table("crops").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase create_crop error: %s", e)

        self.local.crops[crop_id] = record
        return record

    async def update_crop(self, crop_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        if self.is_live:
            try:
                res = self.client.table("crops").update({**updates, "updated_at": now}).eq("id", crop_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase update_crop error: %s", e)

        if crop_id in self.local.crops:
            self.local.crops[crop_id].update({**updates, "updated_at": now})
            return self.local.crops[crop_id]
        return None

    # --- SOIL READINGS ---
    async def record_soil(self, field_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        s_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": s_id, "field_id": field_id, "recorded_at": data.get("recorded_at") or now}

        if self.is_live:
            try:
                res = self.client.table("soil_readings").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase record_soil error: %s", e)

        self.local.soil_readings[s_id] = record
        return record

    async def get_latest_soil(self, field_id: str) -> Optional[Dict[str, Any]]:
        if self.is_live:
            try:
                res = (
                    self.client.table("soil_readings")
                    .select("*")
                    .eq("field_id", field_id)
                    .order("recorded_at", desc=True)
                    .limit(1)
                    .execute()
                )
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase get_latest_soil error: %s", e)

        readings = [s for s in self.local.soil_readings.values() if s.get("field_id") == field_id]
        if not readings:
            return None
        return sorted(readings, key=lambda x: x.get("recorded_at", ""), reverse=True)[0]

    async def get_soil_history(self, field_id: str, limit: int = 15) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                res = (
                    self.client.table("soil_readings")
                    .select("*")
                    .eq("field_id", field_id)
                    .order("recorded_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_soil_history error: %s", e)

        readings = [s for s in self.local.soil_readings.values() if s.get("field_id") == field_id]
        return sorted(readings, key=lambda x: x.get("recorded_at", ""), reverse=True)[:limit]

    # --- DISEASE SCANS ---
    async def save_disease_scan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        scan_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": scan_id, "scanned_at": now}

        if self.is_live:
            try:
                res = self.client.table("disease_scans").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase save_disease_scan error: %s", e)

        self.local.disease_scans[scan_id] = record
        return record

    async def get_disease_scans(self, user_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                q = self.client.table("disease_scans").select("*")
                if user_id:
                    q = q.eq("user_id", user_id)
                res = q.order("scanned_at", desc=True).limit(limit).execute()
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_disease_scans error: %s", e)

        scans = list(self.local.disease_scans.values())
        if user_id:
            scans = [s for s in scans if s.get("user_id") == user_id]
        return sorted(scans, key=lambda x: x.get("scanned_at", ""), reverse=True)[:limit]

    # --- PREDICTIONS & RECOMMENDATIONS ---
    async def save_prediction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        p_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": p_id, "predicted_at": now}

        if self.is_live:
            try:
                res = self.client.table("predictions").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase save_prediction error: %s", e)

        self.local.predictions[p_id] = record
        return record

    async def get_predictions(self, field_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                res = (
                    self.client.table("predictions")
                    .select("*")
                    .eq("field_id", field_id)
                    .order("predicted_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_predictions error: %s", e)

        preds = [p for p in self.local.predictions.values() if p.get("field_id") == field_id]
        return sorted(preds, key=lambda x: x.get("predicted_at", ""), reverse=True)[:limit]

    async def save_recommendation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        r_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {**data, "id": r_id, "generated_at": now}

        if self.is_live:
            try:
                res = self.client.table("recommendations").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error("Supabase save_recommendation error: %s", e)

        self.local.recommendations[r_id] = record
        return record

    async def get_recommendations(self, field_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        if self.is_live:
            try:
                res = (
                    self.client.table("recommendations")
                    .select("*")
                    .eq("field_id", field_id)
                    .order("generated_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error("Supabase get_recommendations error: %s", e)

        recs = [r for r in self.local.recommendations.values() if r.get("field_id") == field_id]
        return sorted(recs, key=lambda x: x.get("generated_at", ""), reverse=True)[:limit]


# Global database instance
db_instance = SupabaseDB()


def get_db() -> SupabaseDB:
    return db_instance

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.supabase import get_db
from app.services.weather_service import weather_service
from app.schemas.weather import WeatherResponse, WeatherForecastResponse

router = APIRouter(tags=["Weather"])


@router.get("/weather", response_model=WeatherResponse)
async def get_general_weather(
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Longitude"),
    location: Optional[str] = Query(None, description="City or village name, e.g. 'Nashik'"),
):
    """
    Fetch current live weather conditions.
    Accepts latitude/longitude or geocodes the location name automatically.
    """
    latitude = lat
    longitude = lon
    loc_name = location or "Regional Farm Station"

    if (latitude is None or longitude is None) and location:
        geo = await weather_service.geocode_location(location)
        if geo:
            latitude = geo["latitude"]
            longitude = geo["longitude"]
            loc_name = f"{geo['name']}, {geo.get('country', '')}"

    if latitude is None or longitude is None:
        # Default to Nashik, Maharashtra (major agricultural cluster)
        latitude = 19.9975
        longitude = 73.7898
        loc_name = "Nashik, Maharashtra (Default Agro-Zone)"

    data = await weather_service.get_current_weather(latitude, longitude, loc_name)
    return data


@router.get("/fields/{field_id}/weather", response_model=WeatherResponse)
async def get_field_current_weather(field_id: str):
    """Fetch current localized weather for a specific field/farm."""
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )

    farm = await db.get_farm(field["farm_id"])
    lat = farm.get("latitude") if farm else None
    lon = farm.get("longitude") if farm else None
    loc_name = f"{farm.get('name', 'Farm')} - {field.get('name', 'Field')}" if farm else field.get("name", "Field")

    if lat is None or lon is None:
        lat = 19.9975
        lon = 73.7898

    return await weather_service.get_current_weather(float(lat), float(lon), loc_name)


@router.get("/fields/{field_id}/weather/forecast", response_model=WeatherForecastResponse)
async def get_field_weather_forecast(field_id: str):
    """Fetch 7-day agricultural forecast tailored to a specific field."""
    db = get_db()
    field = await db.get_field(field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"Field '{field_id}' not found", "error_code": "FIELD_NOT_FOUND"},
        )

    farm = await db.get_farm(field["farm_id"])
    lat = farm.get("latitude") if farm else None
    lon = farm.get("longitude") if farm else None
    loc_name = f"{farm.get('name', 'Farm')} - {field.get('name', 'Field')}" if farm else field.get("name", "Field")

    if lat is None or lon is None:
        lat = 19.9975
        lon = 73.7898

    return await weather_service.get_forecast(float(lat), float(lon), loc_name)

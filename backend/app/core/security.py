import re
from typing import Optional
from fastapi import HTTPException, status


def sanitize_input(text: Optional[str]) -> str:
    """Sanitize user text input to mitigate injection and malicious content."""
    if not text:
        return ""
    # Strip dangerous HTML or control characters
    cleaned = re.sub(r"[<>]", "", text)
    return cleaned.strip()


def validate_image_extension(filename: str) -> bool:
    """Validate that the file has an acceptable image extension."""
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)


def validate_coordinates(lat: Optional[float], lon: Optional[float]) -> bool:
    """Validate latitude (-90 to 90) and longitude (-180 to 180)."""
    if lat is not None and not (-90.0 <= lat <= 90.0):
        return False
    if lon is not None and not (-180.0 <= lon <= 180.0):
        return False
    return True

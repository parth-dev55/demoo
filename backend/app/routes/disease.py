import base64
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, HTTPException, status
from app.db.supabase import get_db
from app.services.disease_service import disease_service
from app.schemas.disease import DiseaseScanResponse

router = APIRouter(prefix="/disease", tags=["Disease Scanner"])


@router.post("/scan", response_model=DiseaseScanResponse)
async def scan_crop_disease(request: Request):
    """
    Multimodal crop disease scanner endpoint.
    Accepts image either as multipart/form-data upload or application/json with base64 string.
    Validates image, uploads to storage, executes vision diagnostics, and logs scan to Supabase.
    """
    content_type = request.headers.get("content-type", "")
    crop: Optional[str] = None
    growth_stage: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    user_id: Optional[str] = None
    field_id: Optional[str] = None
    file_bytes: Optional[bytes] = None
    filename: str = "crop_leaf.jpg"

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
            filename = getattr(uploaded_file, "filename", "crop_leaf.jpg")
        crop = form.get("crop")
        growth_stage = form.get("growth_stage")
        location = form.get("location")
        description = form.get("description")
        user_id = form.get("user_id")
        field_id = form.get("field_id")
    else:
        # JSON body
        try:
            body = await request.json()
        except Exception:
            body = {}

        crop = body.get("crop")
        growth_stage = body.get("growth_stage")
        location = body.get("location")
        description = body.get("description")
        user_id = body.get("user_id")
        field_id = body.get("field_id")
        raw_b64 = body.get("image")

        if raw_b64:
            try:
                if ";base64," in raw_b64:
                    raw_b64 = raw_b64.split(";base64,")[1]
                file_bytes = base64.b64decode(raw_b64)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "message": "Invalid base64 image data", "error_code": "INVALID_IMAGE"},
                )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "An image file or base64 string must be provided.", "error_code": "IMAGE_REQUIRED"},
        )

    try:
        result = await disease_service.analyze_crop_image(
            file_bytes=file_bytes,
            filename=filename,
            crop_hint=crop,
            growth_stage=growth_stage,
            location=location,
            description=description,
            user_id=user_id,
            field_id=field_id,
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": str(ve), "error_code": "VALIDATION_FAILED"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Disease scan failed: {str(e)}", "error_code": "SCAN_FAILED"},
        )


@router.get("/scans", response_model=List[Dict[str, Any]])
async def list_disease_scans(user_id: Optional[str] = None):
    """Retrieve historical disease scan diagnostics for user or farm."""
    db = get_db()
    scans = await db.get_disease_scans(user_id)
    return scans

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, example="How do I protect my flowering tomatoes from heat stress?")
    session_id: Optional[str] = Field(None, example="session-123")
    farm_id: Optional[str] = Field(None, example="farm-demo-01")
    field_id: Optional[str] = Field(None, example="field-demo-01")
    language: Optional[str] = Field("en", example="en")


class ChatResponse(BaseModel):
    message: str
    session_id: str
    recommendations: List[str] = Field(default_factory=list)
    risk_level: str = Field("LOW", example="MODERATE")
    context_used: Dict[str, Any] = Field(default_factory=dict)
    visual_blocks: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str
    content: str
    created_at: str


class ChatSessionResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    created_at: str
    updated_at: str

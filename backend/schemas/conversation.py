"""Pydantic models for conversations."""
from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    model_id: str
    title: str = "New Chat"
    system_prompt: str = ""


class ConversationUpdate(BaseModel):
    title: str | None = None
    model_id: str | None = None
    system_prompt: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    is_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    title: str
    model_id: str
    system_prompt: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = []

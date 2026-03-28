"""Pydantic models for chat requests/responses."""
from pydantic import BaseModel, Field


class Attachment(BaseModel):
    name: str
    type: str  # mime type
    data: str  # base64


class ChatRequest(BaseModel):
    conversation_id: str
    model_id: str
    content: str = Field(..., max_length=50000)
    attachments: list[Attachment] = []
    max_tokens: int = 8192
    temperature: float = 0.7


class ChatStreamEvent(BaseModel):
    type: str  # "chunk" | "done" | "error"
    content: str | None = None
    message: str | None = None
    conversation_id: str | None = None

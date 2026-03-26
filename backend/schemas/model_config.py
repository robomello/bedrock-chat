"""Pydantic models for LLM model configuration."""
from pydantic import BaseModel


class ModelConfig(BaseModel):
    id: str
    display_name: str
    provider: str
    max_tokens: int = 8192
    supports_streaming: bool = True
    supports_system_prompt: bool = True


class ModelConfigCreate(BaseModel):
    id: str
    display_name: str
    provider: str
    max_tokens: int = 8192
    supports_streaming: bool = True
    supports_system_prompt: bool = True


class ModelConfigUpdate(BaseModel):
    display_name: str | None = None
    provider: str | None = None
    max_tokens: int | None = None
    supports_streaming: bool | None = None
    supports_system_prompt: bool | None = None

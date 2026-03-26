"""First-run setup with guard and AWS credential validation."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.config import Settings
from backend.dependencies import get_bedrock, get_settings
from backend.services.bedrock import BedrockService

router = APIRouter()


class SetupStatusResponse(BaseModel):
    setup_complete: bool


@router.get("/api/setup/status", response_model=SetupStatusResponse)
async def setup_status(settings: Settings = Depends(get_settings)):
    """Check if first-run setup is needed."""
    data_dir = Path(settings.data_dir)
    db_exists = (data_dir / "bedrock_chat.db").exists()
    salt_exists = (data_dir / "salt.bin").exists()
    return {"setup_complete": db_exists and salt_exists}


@router.post("/api/setup/validate-credentials")
async def validate_credentials(
    bedrock: BedrockService = Depends(get_bedrock),
):
    """Test AWS credentials and Bedrock access."""
    return await bedrock.validate_credentials()


@router.get("/api/health")
async def health_check():
    return {"status": "ok"}

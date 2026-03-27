"""First-run setup with guard and AWS credential validation."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.config import Settings
from backend.dependencies import get_bedrock, get_settings, rebuild_bedrock_service
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


class CredentialsRequest(BaseModel):
    api_key: str = ""
    endpoint_url: str = ""
    aws_region: str = ""


class CredentialsResponse(BaseModel):
    api_key_set: bool
    api_key_masked: str
    endpoint_url: str
    aws_region: str


@router.get("/api/settings/credentials", response_model=CredentialsResponse)
async def get_credentials(settings: Settings = Depends(get_settings)):
    """Get current credentials (API key is masked)."""
    creds_path = Path(settings.data_dir) / "credentials.json"
    creds = {}
    if creds_path.exists():
        creds = json.loads(creds_path.read_text())

    api_key = creds.get("api_key") or settings.aws_api_key
    endpoint_url = creds.get("endpoint_url") or settings.aws_endpoint_url
    aws_region = creds.get("aws_region") or settings.aws_region

    masked = ""
    if api_key:
        masked = api_key[:4] + "****" + api_key[-4:] if len(api_key) > 8 else "****"

    return {
        "api_key_set": bool(api_key),
        "api_key_masked": masked,
        "endpoint_url": endpoint_url,
        "aws_region": aws_region,
    }


@router.post("/api/settings/credentials")
async def save_credentials(
    request: CredentialsRequest,
    settings: Settings = Depends(get_settings),
):
    """Save credentials and reload the Bedrock service."""
    creds_path = Path(settings.data_dir) / "credentials.json"

    creds = {}
    if creds_path.exists():
        creds = json.loads(creds_path.read_text())

    if request.api_key:
        creds["api_key"] = request.api_key
    if request.endpoint_url:
        creds["endpoint_url"] = request.endpoint_url
    if request.aws_region:
        creds["aws_region"] = request.aws_region

    creds_path.write_text(json.dumps(creds, indent=2))
    rebuild_bedrock_service()

    return {"status": "saved"}


@router.get("/api/health")
async def health_check():
    return {"status": "ok"}


@router.post("/api/shutdown")
async def shutdown():
    """Gracefully shut down the server."""
    import os
    import signal
    import threading

    def _stop():
        os.kill(os.getpid(), signal.SIGTERM)

    threading.Timer(0.5, _stop).start()
    return {"status": "shutting_down"}

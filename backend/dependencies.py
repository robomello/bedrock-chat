"""FastAPI dependency injection."""
from __future__ import annotations

import json
import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy.orm import Session

from backend.config import Settings, get_settings
from backend.database.engine import create_db_engine, create_session_factory
from backend.database.init_db import init_database
from backend.services.bedrock import BedrockService
from backend.services.model_config import ModelConfigService
from backend.utils.encryption import EncryptedText, EncryptionManager

_engine = None
_session_factory = None
_bedrock_service = None
_model_config_service = None


def _load_credentials(data_dir: str) -> dict:
    """Load saved credentials from data/credentials.json."""
    creds_path = Path(data_dir) / "credentials.json"
    if creds_path.exists():
        return json.loads(creds_path.read_text())
    return {}


NEXUS_ENDPOINT = "https://genai-nexus.api.corpinter.net"
NEXUS_REGION = "us-east-1"


def _build_bedrock_service(settings: Settings) -> BedrockService:
    """Create BedrockService using saved credentials with env var fallback."""
    creds = _load_credentials(settings.data_dir)
    return BedrockService(
        region=NEXUS_REGION,
        endpoint_url=creds.get("endpoint_url") or settings.aws_endpoint_url or NEXUS_ENDPOINT,
        api_key=creds.get("api_key") or settings.aws_api_key,
    )


def rebuild_bedrock_service():
    """Hot-reload the Bedrock service with updated credentials."""
    global _bedrock_service
    settings = get_settings()
    _bedrock_service = _build_bedrock_service(settings)


def _init_app():
    """Initialize database, encryption, and services on first request."""
    global _engine, _session_factory, _bedrock_service, _model_config_service

    settings = get_settings()

    # Init encryption
    passphrase = os.environ.get("_BEDROCK_CHAT_PASSPHRASE", "")
    if passphrase:
        manager = EncryptionManager(passphrase, settings.data_dir)
        EncryptedText.set_encryption_manager(manager)

    # Init database
    _engine = create_db_engine(settings.data_dir)
    _session_factory = create_session_factory(_engine)
    init_database(_engine)

    # Init services
    _bedrock_service = _build_bedrock_service(settings)
    _model_config_service = ModelConfigService(
        config_path=Path(settings.data_dir) / "models.json"
    )


def get_db() -> Generator[Session, None, None]:
    if _session_factory is None:
        _init_app()
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()


def get_bedrock() -> BedrockService:
    if _bedrock_service is None:
        _init_app()
    return _bedrock_service


def get_model_config() -> ModelConfigService:
    if _model_config_service is None:
        _init_app()
    return _model_config_service

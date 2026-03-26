"""FastAPI dependency injection."""
from __future__ import annotations

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
    _bedrock_service = BedrockService(
        region=settings.aws_region,
        profile=settings.aws_profile,
    )
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

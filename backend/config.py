"""Application configuration via pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8080
    debug: bool = False
    data_dir: str = "./data"
    aws_region: str = "us-east-1"
    aws_profile: str = ""
    default_model_id: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
    max_message_length: int = 50000
    max_context_messages: int = 50
    cors_origins: list[str] = ["http://127.0.0.1:8080"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="BEDROCK_CHAT_")


@lru_cache
def get_settings() -> Settings:
    return Settings()

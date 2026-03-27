"""Model config load/save from JSON with file locking."""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from filelock import FileLock


DEFAULT_MODELS = [
    {
        "id": "claude-opus-4-6",
        "display_name": "Claude Opus 4.6",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "claude-sonnet-4-6",
        "display_name": "Claude Sonnet 4.6",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "claude-haiku-4-5",
        "display_name": "Claude Haiku 4.5",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
]


class ModelConfigService:
    def __init__(self, config_path: Path):
        self._path = config_path
        self._lock = FileLock(config_path.with_suffix(".lock"))

    def _read(self) -> list[dict]:
        if not self._path.exists():
            self._write(DEFAULT_MODELS)
            return list(DEFAULT_MODELS)
        return json.loads(self._path.read_text())

    def _write(self, models: list[dict]):
        """Atomic write with cross-platform file locking."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            fd, tmp_path = tempfile.mkstemp(
                dir=self._path.parent, suffix=".tmp"
            )
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(models, f, indent=2)
                os.replace(tmp_path, self._path)
            except BaseException:
                os.unlink(tmp_path)
                raise

    def list_models(self) -> list[dict]:
        return self._read()

    def get_model(self, model_id: str) -> dict | None:
        models = self._read()
        for m in models:
            if m["id"] == model_id:
                return m
        return None

    def add_model(self, model: dict) -> dict:
        models = self._read()
        models.append(model)
        self._write(models)
        return model

    def update_model(self, model_id: str, updates: dict) -> dict | None:
        models = self._read()
        for m in models:
            if m["id"] == model_id:
                m.update({k: v for k, v in updates.items() if v is not None})
                self._write(models)
                return m
        return None

    def delete_model(self, model_id: str) -> bool:
        models = self._read()
        filtered = [m for m in models if m["id"] != model_id]
        if len(filtered) == len(models):
            return False
        self._write(filtered)
        return True

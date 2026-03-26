"""Field-level Fernet encryption via SQLAlchemy TypeDecorator."""
from __future__ import annotations

import base64
import os
from pathlib import Path

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy import Text, TypeDecorator


class EncryptionManager:
    """Derives Fernet key from passphrase + salt on every startup."""

    def __init__(self, passphrase: str, data_dir: str):
        salt_path = Path(data_dir) / "salt.bin"
        if salt_path.exists():
            salt = salt_path.read_bytes()
        else:
            salt = os.urandom(16)
            salt_path.parent.mkdir(parents=True, exist_ok=True)
            salt_path.write_bytes(salt)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(passphrase.encode()))
        self.fernet = Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        return self.fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        return self.fernet.decrypt(ciphertext.encode()).decode()


class EncryptedText(TypeDecorator):
    """SQLAlchemy type that transparently encrypts/decrypts text fields.

    Note: _manager is a class-level singleton. This means one encryption key
    per process. This is intentional for the single-app use case but means
    tests that need different keys must reset it between test cases.
    """

    impl = Text
    cache_ok = True

    _manager: EncryptionManager | None = None

    @classmethod
    def set_encryption_manager(cls, manager: EncryptionManager):
        cls._manager = manager

    def process_bind_param(self, value, dialect):
        if value is not None and self._manager is not None:
            return self._manager.encrypt(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and self._manager is not None:
            return self._manager.decrypt(value)
        return value

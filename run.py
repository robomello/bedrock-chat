#!/usr/bin/env python3
"""Bedrock Chat - Launch the application."""
import os
import sys
import getpass
from pathlib import Path


def check_frontend():
    dist = Path(__file__).parent / "frontend" / "dist"
    if not dist.exists():
        print("Frontend not built. Run: cd frontend && npm install && npm run build")
        print("Node.js is required for the frontend build step.")
        sys.exit(1)


def main():
    check_frontend()

    passphrase = os.environ.get("BEDROCK_CHAT_PASSPHRASE")
    if not passphrase:
        passphrase = getpass.getpass("Enter encryption passphrase: ")

    os.environ["_BEDROCK_CHAT_PASSPHRASE"] = passphrase

    import uvicorn
    from backend.config import get_settings

    settings = get_settings()

    uvicorn.run(
        "backend.app:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()

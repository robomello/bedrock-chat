"""FastAPI app factory with SPA catch-all."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings
from backend.routers import chat, conversations, models, setup


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Bedrock Chat")

    # CORS - explicit origins only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # IMPORTANT: Register API routers BEFORE the SPA catch-all,
    # otherwise /{full_path:path} will shadow /api/* routes.
    app.include_router(chat.router)
    app.include_router(conversations.router)
    app.include_router(models.router)
    app.include_router(setup.router)

    # Serve static frontend (must be LAST)
    frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=frontend_dist / "assets"),
            name="assets",
        )

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """SPA catch-all: serve index.html for all non-API routes."""
            file_path = frontend_dist / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(frontend_dist / "index.html")

    return app

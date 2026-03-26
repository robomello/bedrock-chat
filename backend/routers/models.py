"""CRUD for LLM model configuration."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import get_model_config
from backend.schemas.model_config import ModelConfig, ModelConfigCreate, ModelConfigUpdate
from backend.services.model_config import ModelConfigService

router = APIRouter()


@router.get("/api/models", response_model=list[ModelConfig])
async def list_models(
    svc: ModelConfigService = Depends(get_model_config),
):
    return svc.list_models()


@router.post("/api/models", response_model=ModelConfig)
async def add_model(
    request: ModelConfigCreate,
    svc: ModelConfigService = Depends(get_model_config),
):
    return svc.add_model(request.model_dump())


@router.put("/api/models/{model_id}", response_model=ModelConfig)
async def update_model(
    model_id: str,
    request: ModelConfigUpdate,
    svc: ModelConfigService = Depends(get_model_config),
):
    result = svc.update_model(model_id, request.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "Model not found")
    return result


@router.delete("/api/models/{model_id}")
async def delete_model(
    model_id: str,
    svc: ModelConfigService = Depends(get_model_config),
):
    if not svc.delete_model(model_id):
        raise HTTPException(404, "Model not found")
    return {"ok": True}

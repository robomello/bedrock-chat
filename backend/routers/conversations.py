"""CRUD for conversations and messages."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.dependencies import get_db
from backend.schemas.conversation import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse,
)
from backend.services.conversation import (
    create_conversation,
    delete_conversation,
    get_conversation,
    get_conversation_messages_full,
    list_conversations,
    update_conversation,
)

router = APIRouter()


@router.get("/api/conversations", response_model=list[ConversationResponse])
async def list_convs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return list_conversations(db, limit=limit, offset=offset)


@router.post("/api/conversations", response_model=ConversationResponse)
async def create_conv(
    request: ConversationCreate,
    db: Session = Depends(get_db),
):
    return create_conversation(
        db,
        model_id=request.model_id,
        title=request.title,
        system_prompt=request.system_prompt,
    )


@router.get(
    "/api/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
async def get_conv(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    conv = get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    messages = get_conversation_messages_full(
        db, conversation_id, limit=limit, offset=offset
    )
    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        model_id=conv.model_id,
        system_prompt=conv.system_prompt,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                is_complete=m.is_complete,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.put(
    "/api/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
async def update_conv(
    conversation_id: str,
    request: ConversationUpdate,
    db: Session = Depends(get_db),
):
    conv = update_conversation(
        db,
        conversation_id,
        title=request.title,
        model_id=request.model_id,
        system_prompt=request.system_prompt,
    )
    if not conv:
        raise HTTPException(404, "Conversation not found")
    return conv


@router.delete("/api/conversations/{conversation_id}")
async def delete_conv(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    if not delete_conversation(db, conversation_id):
        raise HTTPException(404, "Conversation not found")
    return {"ok": True}

"""Chat streaming router with SSE."""
from __future__ import annotations

import json
import logging

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.config import Settings
from backend.dependencies import get_bedrock, get_db, get_settings
from backend.schemas.chat import ChatRequest
from backend.services.bedrock import BedrockService
from backend.services.conversation import (
    get_conversation,
    get_conversation_messages,
    prepare_messages_for_bedrock,
    save_message,
    update_message,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/chat/stream")
async def stream_chat(
    request: ChatRequest,
    bedrock: BedrockService = Depends(get_bedrock),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if len(request.content) > settings.max_message_length:
        raise HTTPException(400, "Message exceeds maximum length")

    # Load conversation (system_prompt lives on the conversation, not the request)
    conversation = get_conversation(db, request.conversation_id)
    if not conversation:
        raise HTTPException(404, "Conversation not found")

    # Save user message BEFORE streaming (prevents loss)
    save_message(db, request.conversation_id, "user", request.content)

    # Create incomplete assistant message placeholder in DB
    assistant_msg_id = save_message(
        db, request.conversation_id, "assistant", "", is_complete=False
    )

    # Prepare messages with sliding window
    messages = get_conversation_messages(db, request.conversation_id)
    truncated = prepare_messages_for_bedrock(
        messages, settings.max_context_messages
    )

    async def event_generator():
        full_response = []
        try:
            async for chunk in bedrock.stream_chat(
                model_id=request.model_id,
                messages=truncated,
                system_prompt=conversation.system_prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            ):
                full_response.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            complete_text = "".join(full_response)
            update_message(db, assistant_msg_id, complete_text, is_complete=True)
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': request.conversation_id})}\n\n"

        except ClientError as e:
            partial_text = "".join(full_response)
            if partial_text:
                update_message(
                    db, assistant_msg_id, partial_text, is_complete=False
                )
            logger.error("Bedrock error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'An error occurred while generating the response. Check server logs for details.'})}\n\n"

        except Exception as e:
            partial_text = "".join(full_response)
            if partial_text:
                update_message(
                    db, assistant_msg_id, partial_text, is_complete=False
                )
            logger.error("Stream error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )

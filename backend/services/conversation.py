"""Conversation business logic and context window management."""
from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from backend.database.models import Conversation, Message


def prepare_messages_for_bedrock(
    messages: list[dict],
    max_messages: int = 50,
) -> list[dict]:
    """Apply sliding window to keep conversation within context limits."""
    if len(messages) <= max_messages:
        return messages
    return messages[-max_messages:]


def get_conversation(db: Session, conversation_id: str) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def create_conversation(
    db: Session, model_id: str, title: str = "New Chat", system_prompt: str = ""
) -> Conversation:
    conv = Conversation(
        id=str(uuid4()),
        model_id=model_id,
        title=title,
        system_prompt=system_prompt,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def update_conversation(
    db: Session,
    conversation_id: str,
    title: str | None = None,
    model_id: str | None = None,
    system_prompt: str | None = None,
) -> Conversation | None:
    conv = get_conversation(db, conversation_id)
    if not conv:
        return None
    if title is not None:
        conv.title = title
    if model_id is not None:
        conv.model_id = model_id
    if system_prompt is not None:
        conv.system_prompt = system_prompt
    db.commit()
    db.refresh(conv)
    return conv


def delete_conversation(db: Session, conversation_id: str) -> bool:
    conv = get_conversation(db, conversation_id)
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True


def list_conversations(
    db: Session, limit: int = 20, offset: int = 0
) -> list[Conversation]:
    return (
        db.query(Conversation)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_conversation_messages(
    db: Session, conversation_id: str, limit: int = 50, offset: int = 0
) -> list[dict]:
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


def get_conversation_messages_full(
    db: Session, conversation_id: str, limit: int = 50, offset: int = 0
) -> list[Message]:
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def save_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: str,
    is_complete: bool = True,
) -> str:
    msg = Message(
        id=str(uuid4()),
        conversation_id=conversation_id,
        role=role,
        content=content,
        is_complete=is_complete,
    )
    db.add(msg)
    db.commit()
    return msg.id


def update_message(
    db: Session, message_id: str, content: str, is_complete: bool = True
) -> None:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if msg:
        msg.content = content
        msg.is_complete = is_complete
        db.commit()

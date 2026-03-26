<!-- REVIEWED -->
# Bedrock Chat - Implementation Plan

## Context

A self-contained, portable chat webapp that uses AWS Bedrock for LLM calls. Distributable via GitHub -- clone, install, run. No server-specific references, no Docker requirement, no hardcoded infrastructure. Python-proficient team, so FastAPI backend with a modern React frontend is the target stack.

Key design goals:
- **Portable**: Works on any machine with Python 3.11+ and AWS credentials
- **Secure**: Chat history encrypted at rest via field-level Fernet encryption (zero native dependencies)
- **Professional**: Clean UI comparable to ChatGPT/Claude interfaces
- **Configurable**: Users can add/remove/edit LLM models without code changes
- **Streaming**: Real-time token streaming from Bedrock via SSE

## Research Findings

### AWS Bedrock Converse Stream API
- `converse_stream()` returns an event stream with `contentBlockDelta` events containing text chunks
- Events: `messageStart`, `contentBlockStart`, `contentBlockDelta`, `contentBlockStop`, `messageStop`
- Requires `bedrock:InvokeModelWithResponseStream` IAM permission
- Model ID format: `us.anthropic.claude-opus-4-6-v1:0` (cross-region inference profile with version suffix)

### Database Encryption Strategy (Revised per Consensus)
- **Primary**: Field-level Fernet encryption via SQLAlchemy `TypeDecorator` on `Message.content` column
- Uses `cryptography` library (pure pip install, zero native dependencies, works everywhere)
- PBKDF2 key derivation from user passphrase on every startup (key never persisted to disk)
- Salt stored in `data/salt.bin` (gitignored); passphrase prompted on every app launch
- This approach is fully portable across all platforms with no compilation required

### Streaming Architecture
- FastAPI SSE via `StreamingResponse` with `text/event-stream` content type
- Frontend uses `fetch` with `ReadableStream` and a proper line-buffer SSE parser (not naive split)
- Add `X-Accel-Buffering: no` header for reverse proxy compatibility
- `TextDecoder` with `{ stream: true }` for safe multi-byte character handling

### Reference Projects
- `aws-samples/bedrock-chat`: React + Tailwind frontend, FastAPI backend, DynamoDB for history
- `mrnexeon/serverless-amazon-bedrock-fastapi`: FastAPI + Bedrock with session-based chat history
- Pattern: Separate backend API from frontend, SSE for streaming, model config as data

---

## Architecture

### System Diagram

```
Browser (React + Tailwind CSS v4)
    |
    | HTTP/SSE
    |
FastAPI Server (Python, binds 127.0.0.1 by default)
    |
    +-- /api/chat/stream (SSE) --> boto3 converse_stream --> AWS Bedrock
    +-- /api/conversations/*   --> SQLite + Fernet field-level encryption
    +-- /api/models/*          --> models.json (persistent config, file-locked)
    +-- /api/setup             --> First-run passphrase setup + AWS credential check
    |
    +-- Static file serving (built React app from frontend/dist/)
```

### UI Layout

```
+------------------------------------------+------------------+
| [Model Dropdown v]          [Config]     |                  |
+------------------------------------------+   Chat History   |
|                                          |   - Conv 1       |
|          Chat Messages Area              |   - Conv 2       |
|          (markdown rendered)             |   - Conv 3       |
|          (code highlighting)             |   ...            |
|          [Stop Generation]               |                  |
+------------------------------------------+                  |
| [Type your message...          ] [Send]  |  [+ New Chat]    |
+------------------------------------------+------------------+
```

---

## File Structure

```
bedrock-chat/
├── README.md                          # Setup instructions, IAM policy, TLS guidance
├── LICENSE                            # MIT
├── pyproject.toml                     # Modern Python packaging (no setup.py)
├── requirements.txt                   # Pinned dependencies
├── requirements-dev.txt               # Test dependencies
├── .env.example                       # Template for env vars (region, profile, host)
├── .gitignore
├── run.py                             # Entry point: python run.py
│
├── backend/
│   ├── __init__.py
│   ├── app.py                         # FastAPI app factory, CORS, static mount, SPA catch-all
│   ├── config.py                      # Settings via pydantic-settings (env vars)
│   ├── dependencies.py                # FastAPI dependency injection (db session, bedrock client)
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── chat.py                    # POST /api/chat/stream (SSE streaming)
│   │   ├── conversations.py           # CRUD for conversations + messages (paginated)
│   │   ├── models.py                  # CRUD for LLM model config (file-locked writes)
│   │   └── setup.py                   # First-run setup (passphrase, AWS validation)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── bedrock.py                 # boto3 Bedrock client, converse_stream via asyncio.to_thread
│   │   ├── conversation.py            # Conversation business logic + context window management
│   │   └── model_config.py            # Model config load/save from JSON with file locking
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── engine.py                  # SQLite engine with WAL mode + encrypted type
│   │   ├── models.py                  # SQLAlchemy ORM models with EncryptedText type
│   │   └── init_db.py                 # Table creation on startup (not called "migrations")
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── chat.py                    # Pydantic models for chat requests/responses
│   │   ├── conversation.py            # Pydantic models for conversations
│   │   └── model_config.py            # Pydantic models for LLM config
│   │
│   └── utils/
│       ├── __init__.py
│       ├── encryption.py              # EncryptedText TypeDecorator, PBKDF2 derivation
│       └── streaming.py               # SSE event formatting helpers
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts                 # Proxy /api to backend in dev mode
│   ├── tsconfig.json
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Root component, layout
│       ├── index.css                  # Tailwind v4 CSS-first config + global styles
│       │
│       ├── components/
│       │   ├── ChatArea.tsx           # Main chat message display
│       │   ├── ChatInput.tsx          # Message input with send button + stop button
│       │   ├── MessageBubble.tsx      # Individual message (markdown + code + copy)
│       │   ├── Sidebar.tsx            # Right-side conversation list
│       │   ├── ModelSelector.tsx      # Top-right model dropdown
│       │   ├── ConfigPanel.tsx        # Modal/panel for model CRUD
│       │   ├── SetupScreen.tsx        # First-run passphrase + AWS credential check
│       │   ├── SystemPromptInput.tsx  # Collapsible system prompt editor per conversation
│       │   └── LoadingDots.tsx        # Streaming indicator
│       │
│       ├── hooks/
│       │   ├── useChat.ts            # Chat state management + SSE streaming
│       │   ├── useConversations.ts   # Conversation list CRUD
│       │   ├── useModels.ts          # Model config state
│       │   └── useAutoScroll.ts      # Auto-scroll to bottom on new messages
│       │
│       ├── services/
│       │   ├── api.ts                # HTTP client (fetch wrapper)
│       │   └── stream.ts            # Proper SSE line-buffer parser
│       │
│       ├── types/
│       │   └── index.ts             # TypeScript interfaces
│       │
│       └── utils/
│           └── markdown.ts          # Markdown rendering config
│
├── data/                             # Created at runtime (gitignored)
│   ├── bedrock_chat.db              # SQLite database (content fields encrypted)
│   ├── models.json                  # Persistent model configuration
│   └── salt.bin                     # PBKDF2 salt (gitignored)
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                  # Fixtures (test db, mock bedrock client)
│   ├── test_chat_router.py
│   ├── test_conversation_router.py
│   ├── test_model_config.py
│   ├── test_bedrock_service.py
│   ├── test_encryption.py
│   └── test_database.py
│
└── docker/                           # Optional enterprise deployment
    ├── Dockerfile
    └── docker-compose.yml
```

**Total: ~50 files across backend (20), frontend (20), tests (8), config (5)**

---

## Detailed Component Design

### 1. Entry Point (`run.py`)

Launcher with frontend build check and passphrase prompt:
```python
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

    # Prompt for passphrase (never stored on disk)
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
```

### 2. Configuration (`backend/config.py`)

Using `pydantic-settings` for env var management:
```python
class Settings(BaseSettings):
    host: str = "127.0.0.1"  # Local-only by default (security)
    port: int = 8080
    debug: bool = False
    data_dir: str = "./data"
    aws_region: str = "us-east-1"
    aws_profile: str = ""  # Optional, uses default boto3 chain
    default_model_id: str = "us.anthropic.claude-opus-4-6-v1:0"
    max_message_length: int = 50000  # characters
    max_context_messages: int = 50  # sliding window for Bedrock calls
    cors_origins: list[str] = ["http://127.0.0.1:8080"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="BEDROCK_CHAT_")
```

### 3. Encryption (`backend/utils/encryption.py`)

Field-level Fernet encryption via SQLAlchemy TypeDecorator:
```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64, os
from pathlib import Path
from sqlalchemy import TypeDecorator, Text

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

    # Set at app startup via set_encryption_manager()
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
```

### 4. Database Engine (`backend/database/engine.py`)

SQLite with WAL mode for better concurrency:
```python
from sqlalchemy import create_engine, event

def create_db_engine(data_dir: str):
    db_path = Path(data_dir) / "bedrock_chat.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        pool_size=5,
        pool_pre_ping=True,
    )

    # Enable WAL mode for better concurrent read performance
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")  # 5s retry on lock
        cursor.close()

    return engine
```

### 5. Database Models (`backend/database/models.py`)

```python
from datetime import datetime, UTC

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, default="New Chat")
    model_id: Mapped[str] = mapped_column(String)
    system_prompt: Mapped[str] = mapped_column(EncryptedText, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(EncryptedText)  # Fernet-encrypted at rest
    is_complete: Mapped[bool] = mapped_column(Boolean, default=True)  # Track streaming completion
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
```

Note: `model_id` removed from Message (per consensus -- only Conversation tracks the model). `is_complete` added to handle partial responses from interrupted streams.

### 6. Bedrock Service (`backend/services/bedrock.py`)

Using `asyncio.to_thread` (not deprecated `get_event_loop`):
```python
import asyncio
from collections.abc import AsyncGenerator

class BedrockService:
    def __init__(self, region: str, profile: str = ""):
        session_kwargs = {}
        if profile:
            session_kwargs["profile_name"] = profile
        self._session_kwargs = session_kwargs
        self._region = region
        self._client = None

    def _get_client(self):
        """Lazy client creation -- handles credential refresh."""
        if self._client is None:
            session = boto3.Session(**self._session_kwargs)
            self._client = session.client("bedrock-runtime", region_name=self._region)
        return self._client

    def _reset_client(self):
        """Force client recreation on credential expiry."""
        self._client = None

    async def stream_chat(
        self,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from Bedrock using converse_stream."""
        bedrock_messages = [
            {"role": m["role"], "content": [{"text": m["content"]}]}
            for m in messages
        ]

        kwargs = {
            "modelId": model_id,
            "messages": bedrock_messages,
            "inferenceConfig": {
                "maxTokens": max_tokens,
                "temperature": temperature,
            },
        }
        if system_prompt:
            kwargs["system"] = [{"text": system_prompt}]

        # Run blocking boto3 call in thread pool
        client = self._get_client()
        response = await asyncio.to_thread(client.converse_stream, **kwargs)

        # Iterate stream in thread to avoid blocking event loop
        queue: asyncio.Queue = asyncio.Queue()

        def _read_stream():
            try:
                for event in response["stream"]:
                    if "contentBlockDelta" in event:
                        delta = event["contentBlockDelta"]["delta"]
                        if "text" in delta:
                            queue.put_nowait(delta["text"])
                queue.put_nowait(None)  # Success sentinel
            except Exception as e:
                queue.put_nowait(e)  # Error sentinel

        # Start stream reader in background thread
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _read_stream)

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if isinstance(chunk, Exception):
                raise chunk
            yield chunk

    async def validate_credentials(self) -> dict:
        """Test AWS credentials and Bedrock access. Returns status dict."""
        try:
            client = self._get_client()
            await asyncio.to_thread(
                client.converse,
                modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                messages=[{"role": "user", "content": [{"text": "hi"}]}],
                inferenceConfig={"maxTokens": 1},
            )
            return {"valid": True, "error": None}
        except Exception as e:
            self._reset_client()
            return {"valid": False, "error": "AWS credentials invalid or Bedrock access denied."}
```

### 7. Context Window Management (`backend/services/conversation.py`)

```python
def prepare_messages_for_bedrock(
    messages: list[dict],
    max_messages: int = 50,
) -> list[dict]:
    """Apply sliding window to keep conversation within context limits.

    Keeps the most recent N messages. If the conversation is longer,
    prepends a system note about truncation.
    """
    if len(messages) <= max_messages:
        return messages

    truncated = messages[-max_messages:]
    return truncated
```

### 8. Chat Streaming Router (`backend/routers/chat.py`)

With error sanitization, partial response saving, and user message pre-save:
```python
@router.post("/api/chat/stream")
async def stream_chat(
    request: ChatRequest,
    bedrock: BedrockService = Depends(get_bedrock),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    # Validate message length
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
    truncated = prepare_messages_for_bedrock(messages, settings.max_context_messages)

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

            # Update assistant message with complete response
            complete_text = "".join(full_response)
            update_message(db, assistant_msg_id, complete_text, is_complete=True)
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': request.conversation_id})}\n\n"

        except ClientError as e:
            # Save partial response on error
            partial_text = "".join(full_response)
            if partial_text:
                update_message(db, assistant_msg_id, partial_text, is_complete=False)
            # NEVER leak AWS error details to client
            logger.error(f"Bedrock error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'An error occurred while generating the response. Check server logs for details.'})}\n\n"

        except Exception as e:
            partial_text = "".join(full_response)
            if partial_text:
                update_message(db, assistant_msg_id, partial_text, is_complete=False)
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
```

### 9. Setup Router (`backend/routers/setup.py`)

With guard against re-initialization:
```python
@router.get("/api/setup/status")
async def setup_status(settings: Settings = Depends(get_settings)):
    """Check if first-run setup is needed."""
    data_dir = Path(settings.data_dir)
    db_exists = (data_dir / "bedrock_chat.db").exists()
    salt_exists = (data_dir / "salt.bin").exists()
    return {"setup_complete": db_exists and salt_exists}

@router.post("/api/setup/initialize")
async def initialize(
    request: SetupRequest,
    settings: Settings = Depends(get_settings),
):
    """First-run setup. BLOCKED if setup already completed."""
    data_dir = Path(settings.data_dir)
    if (data_dir / "bedrock_chat.db").exists() and (data_dir / "salt.bin").exists():
        raise HTTPException(403, "Setup already completed. Cannot re-initialize.")
    # ... proceed with initialization
```

### 10. Model Config Service (`backend/services/model_config.py`)

With file locking and atomic writes:
```python
from filelock import FileLock
import tempfile

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
        with self._lock:
            fd, tmp_path = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(models, f, indent=2)
                os.replace(tmp_path, self._path)
            except BaseException:
                os.unlink(tmp_path)
                raise

DEFAULT_MODELS = [
    {
        "id": "us.anthropic.claude-opus-4-6-v1:0",
        "display_name": "Claude Opus 4.6",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "display_name": "Claude Sonnet 4.5",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "display_name": "Claude Haiku 4.5",
        "provider": "Anthropic",
        "max_tokens": 8192,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "us.amazon.nova-pro-v1:0",
        "display_name": "Amazon Nova Pro",
        "provider": "Amazon",
        "max_tokens": 4096,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
    {
        "id": "us.amazon.nova-lite-v1:0",
        "display_name": "Amazon Nova Lite",
        "provider": "Amazon",
        "max_tokens": 4096,
        "supports_streaming": True,
        "supports_system_prompt": True,
    },
]
```

### 11. Frontend SSE Parser (`frontend/src/services/stream.ts`)

Proper line-buffer parser that handles chunk boundaries:
```typescript
/**
 * Proper SSE parser that buffers across chunk boundaries.
 * Handles multi-byte characters and split events correctly.
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<{ type: string; content?: string; message?: string; conversation_id?: string }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: false })
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Stream-safe decoding (handles multi-byte splits)
      buffer += decoder.decode(value, { stream: true })

      // Process complete events (delimited by \n\n)
      const parts = buffer.split("\n\n")
      buffer = parts.pop()!  // Keep incomplete part in buffer

      for (const part of parts) {
        const lines = part.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              yield JSON.parse(line.slice(6))
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    // Flush remaining decoder buffer
    buffer += decoder.decode()
    if (buffer.trim()) {
      const lines = buffer.split("\n")
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6))
          } catch {
            // Skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

### 12. Frontend Chat Hook (`frontend/src/hooks/useChat.ts`)

With proper SSE consumption, stop generation, and conversation creation:
```typescript
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  const sendMessage = async (content: string, modelId: string) => {
    // Abort any in-flight stream before starting new one
    abortControllerRef.current?.abort()

    // Create conversation on first message if needed
    let convId = conversationId
    if (!convId) {
      const conv = await api.createConversation(modelId)
      convId = conv.id
      setConversationId(convId)
    }

    // Add user message (immutable)
    const userMsg: Message = { role: "user", content, id: crypto.randomUUID() }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    // Create placeholder for assistant response
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }])

    // Stream via SSE with abort support
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: convId,
          model_id: modelId,
          content,
        }),
        signal: controller.signal,
      })

      for await (const event of parseSSEStream(response)) {
        if (event.type === "chunk" && event.content) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + event.content }
                : m
            )
          )
        } else if (event.type === "error") {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: event.message ?? "Error occurred", isError: true }
                : m
            )
          )
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Stream error:", e)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const switchConversation = (convId: string) => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setConversationId(convId)
    // Load messages for new conversation handled by caller
  }

  return { messages, isStreaming, conversationId, sendMessage, stopGeneration, switchConversation, setMessages }
}
```

### 13. FastAPI App Factory (`backend/app.py`)

With SPA catch-all route and explicit CORS:
```python
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
    app.include_router(chat_router)
    app.include_router(conversations_router)
    app.include_router(models_router)
    app.include_router(setup_router)

    # Serve static frontend (must be LAST)
    frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """SPA catch-all: serve index.html for all non-API routes."""
            file_path = frontend_dist / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(frontend_dist / "index.html")

    return app
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/stream` | Stream chat response (SSE) |
| GET | `/api/conversations` | List conversations (paginated: `?limit=20&offset=0`) |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/{id}` | Get conversation with messages (paginated: `?limit=50&offset=0`) |
| PUT | `/api/conversations/{id}` | Update conversation (title, model, system_prompt) |
| DELETE | `/api/conversations/{id}` | Delete conversation and messages |
| GET | `/api/models` | List configured models |
| POST | `/api/models` | Add a model |
| PUT | `/api/models/{id}` | Update a model |
| DELETE | `/api/models/{id}` | Remove a model |
| GET | `/api/setup/status` | Check if first-run setup is needed |
| POST | `/api/setup/initialize` | First-run setup (guarded: blocked if already initialized) |
| POST | `/api/setup/validate-credentials` | Test AWS credentials + Bedrock access |
| GET | `/api/health` | Health check |

---

## Prerequisites (Phase 0 -- Run First)

### Required Packages (Backend)

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| fastapi | >=0.115 | Web framework | Core |
| uvicorn[standard] | >=0.30 | ASGI server | Core |
| boto3 | >=1.35 | AWS SDK | Bedrock API |
| sqlalchemy | >=2.0 | ORM | Database |
| pydantic-settings | >=2.0 | Config management | Env vars |
| python-dotenv | >=1.0 | .env file loading | Config |
| cryptography | >=43.0 | Fernet encryption + PBKDF2 | Field-level encryption |
| filelock | >=3.0 | Cross-platform file locking | models.json writes |

### Test Dependencies (requirements-dev.txt)

| Package | Version | Purpose |
|---------|---------|---------|
| pytest | >=8.0 | Test framework |
| pytest-asyncio | >=0.24 | Async test support |
| httpx | >=0.27 | FastAPI TestClient |

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19 | UI library |
| react-dom | ^19 | DOM rendering |
| react-markdown | ^10 | Markdown rendering |
| react-syntax-highlighter | ^15 | Code highlighting |
| tailwindcss | ^4 | CSS framework (v4 CSS-first config) |
| @tailwindcss/vite | ^4 | Vite plugin for Tailwind v4 |
| vite | ^6 | Build tool |
| typescript | ^5.5 | Type safety |

### System Requirements

- Python 3.11+
- Node.js 18+ (for frontend build only, not at runtime)
- AWS credentials configured (env vars, ~/.aws/credentials, or IAM role)

### Verification Commands

```bash
# Backend
pip install -r requirements.txt
python -c "import boto3; import fastapi; import cryptography; print('All backend deps OK')"

# Frontend
cd frontend && npm install && npm run build && echo "Frontend build OK"

# AWS credentials
aws sts get-caller-identity  # Verify credentials work
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[0].modelId' 2>/dev/null && echo "Bedrock access OK"
```

---

## Task Breakdown

### Phase 1: Backend Core (Priority: Highest)

**Task 1.1: Project scaffolding**
- Create directory structure
- Write `pyproject.toml`, `requirements.txt`, `requirements-dev.txt`, `.gitignore`, `.env.example`
- Write `run.py` entry point with frontend check and passphrase prompt
- Dependencies: None

**Task 1.2: Configuration module**
- `backend/config.py` with pydantic-settings
- Default host `127.0.0.1` (local-only), configurable CORS origins
- `max_message_length` and `max_context_messages` settings
- Dependencies: 1.1

**Task 1.3: Encryption utilities**
- `backend/utils/encryption.py` - EncryptionManager (PBKDF2 + Fernet)
- `EncryptedText` SQLAlchemy TypeDecorator for transparent field encryption
- Salt generation/loading from `data/salt.bin`
- Dependencies: 1.2

**Task 1.4: Database layer**
- `backend/database/engine.py` - SQLite engine with WAL mode, busy_timeout, check_same_thread=False
- `backend/database/models.py` - Conversation + Message ORM models (Message.content uses EncryptedText)
- `backend/database/init_db.py` - Table creation on startup (clearly named, not "migrations")
- Dependencies: 1.2, 1.3

**Task 1.5: Pydantic schemas**
- `backend/schemas/chat.py` - ChatRequest (with max_message_length validation, no system_prompt — lives on Conversation), ChatStreamEvent
- `backend/schemas/conversation.py` - ConversationCreate, ConversationUpdate, ConversationResponse (includes system_prompt field)
- `backend/schemas/model_config.py` - ModelConfig schema
- Dependencies: None (can parallel with 1.3, 1.4)

**Task 1.6: Bedrock service**
- `backend/services/bedrock.py` - boto3 client with `asyncio.to_thread` for all blocking calls
- Stream reading in background thread via asyncio.Queue
- Lazy client creation with refresh on credential expiry
- `validate_credentials()` method
- Dependencies: 1.2

**Task 1.7: Conversation service**
- `backend/services/conversation.py` - Business logic + context window management
- `prepare_messages_for_bedrock()` with sliding window (max_context_messages)
- Dependencies: 1.4, 1.5

**Task 1.8: Model config service**
- `backend/services/model_config.py` - JSON file CRUD with file locking (filelock) and atomic writes
- Default models seeded on first run
- Dependencies: 1.2, 1.5

**Task 1.9: API routers**
- `backend/routers/chat.py` - SSE streaming with error sanitization, partial response saving, pre-save user message
- `backend/routers/conversations.py` - CRUD with pagination (limit/offset)
- `backend/routers/models.py` - Model config endpoints
- `backend/routers/setup.py` - First-run setup with guard + AWS credential validation
- Dependencies: 1.4, 1.5, 1.6, 1.7, 1.8

**Task 1.10: FastAPI app factory**
- `backend/app.py` - Wire routers, CORS (explicit origins), static files, SPA catch-all route
- `backend/dependencies.py` - Dependency injection (db session, bedrock service, settings)
- Dependencies: 1.9

### Phase 2: Frontend (Priority: High)

**Task 2.1: Frontend scaffolding**
- Vite + React 19 + TypeScript + Tailwind v4 setup
- Tailwind v4 CSS-first config (no tailwind.config.js -- use `@import "tailwindcss"` in CSS)
- `@tailwindcss/vite` plugin
- Vite proxy config for `/api` in dev mode
- Dependencies: None (can parallel with Phase 1)

**Task 2.2: Type definitions and API client**
- `frontend/src/types/index.ts` - Message, Conversation, ModelConfig interfaces
- `frontend/src/services/api.ts` - Fetch wrapper with error handling
- `frontend/src/services/stream.ts` - Proper SSE line-buffer parser with TextDecoder({stream: true})
- Dependencies: 2.1

**Task 2.3: Chat components**
- `ChatArea.tsx` - Message display with auto-scroll
- `ChatInput.tsx` - Input field with send button, Enter to send, stop generation button
- `SystemPromptInput.tsx` - Collapsible text area at top of chat for editing conversation system prompt
- `MessageBubble.tsx` - Markdown rendering, code highlighting, copy-to-clipboard button
- `LoadingDots.tsx` - Streaming indicator animation
- Dependencies: 2.2

**Task 2.4: Sidebar**
- `Sidebar.tsx` - Conversation list with new chat button, delete button per conversation
- Sorted by most recent (updated_at)
- Active conversation highlighted
- Collapsible on mobile
- Dependencies: 2.2

**Task 2.5: Model selector and config**
- `ModelSelector.tsx` - Dropdown in top-right
- `ConfigPanel.tsx` - Modal for add/edit/remove models (model ID, display name, provider)
- Dependencies: 2.2

**Task 2.6: Setup screen**
- `SetupScreen.tsx` - First-run passphrase input with confirmation
- AWS credential validation feedback
- Dependencies: 2.2

**Task 2.7: Custom hooks**
- `useChat.ts` - Chat state + SSE streaming + stop generation + conversation auto-creation + abort on switch
- `useConversations.ts` - Conversation list state with pagination
- `useModels.ts` - Model config state
- `useAutoScroll.ts` - Scroll management
- Dependencies: 2.2

**Task 2.8: App integration**
- `App.tsx` - Wire all components together
- `main.tsx` - React root
- Responsive layout (sidebar collapsible on mobile)
- Dependencies: 2.3-2.7

### Phase 3: Integration and Polish

**Task 3.1: Static file serving**
- Build frontend, serve from FastAPI with SPA catch-all
- Document build step in README
- Dependencies: Phase 1 + Phase 2

**Task 3.2: Auto-title generation**
- After first assistant response, generate conversation title via Bedrock
- Use haiku model for cost efficiency
- Fallback: first 80 chars of first user message
- Dependencies: 3.1

**Task 3.3: Error handling and edge cases**
- Network errors with user-friendly messages
- AWS throttling handling (429 retry-after)
- Invalid model ID handling
- Empty state UI (no conversations yet)
- Dependencies: 3.1

### Phase 4: Testing

**Task 4.1: Backend unit tests**
- Test encryption (encrypt/decrypt roundtrip, wrong passphrase fails)
- Test model config CRUD (file locking, atomic writes)
- Test conversation service (sliding window, message save/load)
- Mock Bedrock client for streaming tests
- Dependencies: Phase 1

**Task 4.2: Backend integration tests**
- Test API endpoints with test database (httpx TestClient)
- Test SSE streaming format correctness
- Test setup guard (cannot re-initialize)
- Test pagination on conversations and messages
- Dependencies: Phase 1

### Phase 5: Distribution

**Task 5.1: Documentation**
- `README.md` with:
  - Quick start (clone, pip install, npm build, python run.py)
  - AWS IAM policy (minimal Bedrock-only permissions)
  - TLS/HTTPS guidance for team deployment (nginx reverse proxy example)
  - Environment variables reference
  - Screenshots
- `.env.example` with all configuration options documented
- Dependencies: Phase 3

**Task 5.2: Optional Docker**
- `docker/Dockerfile` - Multi-stage build (Node for frontend, Python for backend)
- `docker/docker-compose.yml` - Simple docker-compose for enterprise deployment
- Documented as optional, not the primary distribution method
- Dependencies: Phase 3

---

## Key Design Decisions

### 1. Why SSE over WebSockets?
- SSE is simpler, works over standard HTTP
- Chat is request/response pattern -- unidirectional streaming fits perfectly
- No connection upgrade complexity
- Better proxy/firewall compatibility in corporate environments

### 2. Why Fernet field-level encryption over SQLCipher?
- `cryptography` is a pure pip install -- works on every platform with no native dependencies
- `sqlcipher3` requires platform-specific binary wheels that are not available everywhere
- Fernet via SQLAlchemy TypeDecorator is transparent at the ORM level
- Only `Message.content` needs encryption (the sensitive data)
- Zero compilation, zero system libraries -- matches "clone, install, run" mandate

### 3. Why passphrase on every startup instead of persisted key?
- Storing the derived key in `.env` defeats the purpose of the passphrase
- Passphrase entry on startup provides actual security -- key exists only in memory
- Can optionally pass via `BEDROCK_CHAT_PASSPHRASE` env var for automation
- OS keychain integration can be added later as an enhancement

### 4. Why JSON file for model config?
- Simple, human-readable, editable
- No database schema migration needed when adding model fields
- Easy to version control or share configurations
- File locking + atomic writes prevent corruption

### 5. Why single-process architecture?
- Target audience is individual or small team use
- SQLite with WAL mode handles concurrent reads well
- No need for Redis, Celery, or message queues
- Reduces operational complexity for a GitHub-distributed tool

### 6. Why `127.0.0.1` default host?
- Prevents accidental exposure on corporate networks
- User must explicitly set `BEDROCK_CHAT_HOST=0.0.0.0` for network access
- README documents TLS guidance for team deployments

---

## How to Add a New Bedrock Model

After the app is running, users can add models in two ways:

### Via the UI (Config Panel)
1. Click the gear icon (top-right)
2. Click "Add Model"
3. Fill in: Model ID (e.g. `us.meta.llama4-maverick-17b-instruct-v1:0`), Display Name, Provider
4. Click Save
5. Model appears in the dropdown immediately

### Via the JSON file
1. Open `data/models.json`
2. Add an entry:
```json
{
  "id": "us.meta.llama4-maverick-17b-instruct-v1:0",
  "display_name": "Llama 4 Maverick 17B",
  "provider": "Meta",
  "max_tokens": 4096,
  "supports_streaming": true,
  "supports_system_prompt": true
}
```
3. Model appears immediately on next API call (no restart needed)

---

## Verification Steps

1. **Backend starts**: `python run.py` -- prompts for passphrase, starts on 127.0.0.1:8080
2. **Health check**: `curl http://127.0.0.1:8080/api/health` returns `{"status": "ok"}`
3. **Setup flow**: First visit shows passphrase setup + AWS credential validation
4. **Model list**: `GET /api/models` returns default models
5. **Create conversation**: `POST /api/conversations` returns new conversation with ID
6. **Stream chat**: `POST /api/chat/stream` returns SSE events with text chunks (no garbled output)
7. **Conversation persists**: Refresh page, conversation appears in sidebar
8. **Model config**: Add/edit/remove model via Config panel
9. **Encrypted content**: Direct SQLite inspection shows encrypted blobs in content column
10. **Context window**: Long conversation (50+ messages) streams without error
11. **Stop generation**: Click stop button mid-stream, partial response saved
12. **Wrong passphrase**: Restart with wrong passphrase, decryption fails with clear error

---

## Default Models (Shipped Out of Box)

| Model ID | Display Name | Provider |
|----------|-------------|----------|
| `us.anthropic.claude-opus-4-6-v1:0` | Claude Opus 4.6 | Anthropic |
| `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | Claude Sonnet 4.5 | Anthropic |
| `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | Anthropic |
| `us.amazon.nova-pro-v1:0` | Amazon Nova Pro | Amazon |
| `us.amazon.nova-lite-v1:0` | Amazon Nova Lite | Amazon |

All model IDs include the `:0` version suffix required by Bedrock API. Users should verify model availability in their AWS region and add/remove models via the Config panel.

---

## Security Considerations

- **No secrets in code**: AWS credentials via boto3 standard chain only
- **Encryption at rest**: Fernet AES-128 on all message content (key derived from passphrase)
- **Key never persisted**: Passphrase prompted on every startup, derived key lives only in memory
- **No telemetry**: Zero external calls except to AWS Bedrock
- **CORS locked**: Explicit origins only (configurable)
- **Local-only by default**: Binds to `127.0.0.1` -- must opt-in to network exposure
- **Error sanitization**: AWS errors logged server-side, generic message sent to client
- **Input validation**: All API inputs validated via Pydantic (max message length enforced)
- **Setup guard**: `/api/setup/initialize` blocked once database exists
- **Gitignored secrets**: `.env`, `data/` directory in `.gitignore`
- **IAM policy**: README includes minimal Bedrock-only IAM policy
- **TLS guidance**: README documents nginx reverse proxy setup for team deployment

---

## Review Notes

### Changes Incorporated from Consensus

| Finding | Severity | Action Taken |
|---------|----------|-------------|
| **U1: SQLCipher portability** | CRITICAL (4/4) | Switched to Fernet field-level encryption as primary and only strategy. Removed SQLCipher entirely. |
| **U2: Derived key stored in .env** | CRITICAL (4/4) | Key never persisted. Passphrase prompted on every startup via getpass. Optional env var for automation. |
| **M2: SSE parsing broken** | CRITICAL (2/4) | Wrote proper line-buffer parser with TextDecoder({stream: true}) and \n\n event delimiters. |
| **M1: asyncio.get_event_loop() deprecated** | HIGH (3/4) | Replaced with asyncio.to_thread() and asyncio.get_running_loop(). Stream iteration in background thread via Queue. |
| **D1: Conversation ID not created before first message** | CRITICAL (1/4) | Added explicit conversation creation flow in useChat hook before first message. |
| **D2: Setup endpoint unauthenticated** | HIGH (1/4) | Added guard: blocked if database already exists. |
| **M4: Frontend build not integrated** | HIGH (2/4) | Added check_frontend() in run.py with clear error message. Node.js documented as requirement. |
| **M7: Context window overflow** | HIGH (2/4) | Added sliding window (max_context_messages=50) in conversation service. |
| **AWS error leakage** | HIGH (1/4) | Sanitized all error messages. ClientError details logged server-side only. |
| **Partial response lost on stream failure** | HIGH (2/4) | User message saved before streaming. Assistant message created as is_complete=False, updated on completion or error. |
| **M3: Missing test dependencies** | MEDIUM (3/4) | Added requirements-dev.txt with pytest, pytest-asyncio, httpx. |
| **M5: No pagination** | MEDIUM (2/4) | Added limit/offset params to conversation and message list endpoints. |
| **M6: migrations.py is create_all()** | MEDIUM (2/4) | Renamed to init_db.py. Clear naming, no false migration promise. |
| **M8: SQLite concurrency** | MEDIUM (2/4) | Added WAL mode, busy_timeout=5000, check_same_thread=False, pool_size=5. |
| **M9: Model ID format** | MEDIUM (2/4) | Added `:0` suffix to all model IDs. Documented verification step. |
| **M10: Tailwind v4 config API** | MEDIUM (2/4) | Removed tailwind.config.js from file structure. Using CSS-first config with @tailwindcss/vite. |
| **M11: Rate limiting** | MEDIUM (2/4) | Deferred to Phase 3. Noted as enhancement. Single-user app on 127.0.0.1 has low abuse risk. |
| **Model ID on Message table** | MEDIUM (1/4) | Removed. Only Conversation tracks model_id. |
| **models.json file locking** | HIGH (1/4) | Added filelock package for cross-platform locking + atomic writes via tempfile + os.replace. |
| **Host binding security** | HIGH (1/4) | Changed default from 0.0.0.0 to 127.0.0.1. Added TLS guidance in README. |
| **SPA catch-all route** | MEDIUM (1/4) | Added /{full_path:path} catch-all in app.py for React Router support. |
| **setup.py + pyproject.toml redundant** | MEDIUM (1/4) | Removed setup.py. Using only pyproject.toml. |
| **Credential expiry handling** | MEDIUM (1/4) | Added lazy client creation with _reset_client() for credential refresh. |

### Dismissed Findings

| Finding | Reason |
|---------|--------|
| "Over-modularized (50 files)" | Standard structure for full-stack app. Aids maintainability. |
| "React 19 / Tailwind 4 too new" | It's March 2026. React 19 is 15+ months old. Tailwind 4 is stable. |
| "SQLAlchemy version pinning" | Low priority noise. >=2.0 is standard. |
| "Optional Docker contradicts portable" | Docker is explicitly optional for enterprise deployment, not the primary path. |
| "Missing features (regenerate, edit, export)" | Nice-to-have features for v2. Core functionality first. |

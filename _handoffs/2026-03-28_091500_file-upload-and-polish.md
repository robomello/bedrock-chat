# Handoff: Bedrock Chat — File Upload & UI Polish

**Date**: 2026-03-28 09:15:00 (UTC-6)
**Project**: bedrock-chat
**Branch**: master
**Session Summary**: Installed bedrock-chat from scratch, adapted it to work with Mercedes GenAI Nexus gateway (Anthropic SDK + api-key header), added theme selector (Light/Dark/Retro/System), settings panel with API key entry, desktop launch scripts, server shutdown from UI, and started building file upload (images + PDF) support which is not yet working.

## Completed This Session
- Cloned and installed bedrock-chat from `robomello/bedrock-chat` (commit: dad32e8)
- Replaced boto3 with Anthropic SDK for GenAI Nexus gateway compatibility (commit: cc61dfc)
- Fixed model IDs to use short Nexus format: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5` (commit: f76255e)
- Added theme selector: Light, Dark (black base #141414), Retro (Commodore green phosphor), System (commit: f76255e)
- Changed gear icon to wrench for model config (commit: f76255e)
- Added server shutdown button in config panel via `POST /api/shutdown` (commit: f76255e)
- Added `setup.vbs` and `start.vbs` for IT-friendly launch without .bat files (commit: f76255e)
- Added `create-shortcuts.ps1` for desktop shortcut with icon (commit: f76255e)
- Added API key entry in settings panel, stored in `data/credentials.json` (commit: bbe6b40)
- Skipped setup screen — app loads directly, credentials via wrench icon (commit: 98542c4)
- Simplified settings — removed endpoint URL and AWS region fields, hardcoded Nexus endpoint (commit: 32b5e53)
- Simplified model add/edit — removed Provider and Max Tokens fields (commit: 76ba09f)
- File upload feature (images + PDF) — backend and frontend code written (uncommitted)

## In Progress
- [ ] File upload (images + PDF) — Frontend sends attachments as base64, backend passes as content blocks to Anthropic SDK. **BUG**: Attachments are not reaching the model. The logging shows `ATTACHMENTS COUNT` is not appearing in logs, suggesting the `event_generator()` lazy execution means logs run later. Need to verify frontend is actually sending attachment data in the request body. The backend code in `bedrock.py` injects attachments into the last user message as content blocks — logic looks correct but needs testing.

## Key Decisions Made
- **Decision**: Use `anthropic.AnthropicBedrock` SDK instead of boto3
  **Reasoning**: GenAI Nexus gateway requires `api-key` header and only supports Anthropic SDK's Messages API, not boto3's Converse API
  **Alternatives Rejected**: boto3 with custom headers (gateway returned 404 on all converse_stream calls)

- **Decision**: Short model IDs like `claude-opus-4-6` instead of full Bedrock ARNs
  **Reasoning**: Nexus gateway routes by short name; full ARNs like `us.anthropic.claude-opus-4-6-v1:0` return 404

- **Decision**: Store credentials in `data/credentials.json` instead of `.env`
  **Reasoning**: Allows users to change API key from the UI without editing files. `.env` still works as fallback.

- **Decision**: Hardcode Nexus endpoint `https://genai-nexus.api.corpinter.net` and region `us-east-1`
  **Reasoning**: All Mercedes users use the same gateway. Removed unnecessary UI fields.

- **Decision**: VBS scripts instead of BAT files for launch
  **Reasoning**: IT policies often flag .bat files. VBS is native Windows scripting and rarely flagged.

- **Decision**: Dark theme uses black base (#141414) not navy (#1a1a2e)
  **Reasoning**: User explicitly requested no navy/blue tint — wanted it similar to retro but one level brighter

## Known Issues
- File upload feature not working — attachments don't reach the model (severity: high, files: `backend/routers/chat.py`, `frontend/src/components/ChatInput.tsx`, `frontend/src/hooks/useChat.ts`)
- Possible cause: need to verify the frontend actually includes `attachments` array in the POST body, and that the backend's `event_generator()` correctly reads them before the request object is garbage collected
- 32-bit Python warning on cryptography (cosmetic, severity: low)

## Next Steps (Priority Order)
1. **Fix file upload** — Add `logger.warning` BEFORE `event_generator()` to confirm attachments arrive. Check browser DevTools Network tab to verify the POST body includes attachment data. The base64 PDF could be very large — check if there's a request size limit.
2. **Push file upload to GitHub** — Once working, commit and push
3. **Add PPTX support** — User initially wanted PPTX, agreed to skip for now. Could add later via COM automation (PowerPoint installed on Mercedes Windows machines) or python-pptx text extraction.
4. **Multi-provider support** — User asked about ChatGPT/Gemini. Would need separate SDK backends per provider. Check if Nexus gateway supports other models first.

## Files Actively Being Edited
- `backend/routers/chat.py` — Added attachment passthrough + debug logging (uncommitted)
- `backend/schemas/chat.py` — Added `Attachment` model and `attachments` field to `ChatRequest` (uncommitted)
- `backend/services/bedrock.py` — Rewritten to inject image/document content blocks from attachments (uncommitted)
- `frontend/src/types/index.ts` — Added `Attachment` interface to `Message` type (uncommitted)
- `frontend/src/components/ChatInput.tsx` — Added paperclip button, file picker, base64 conversion, preview thumbnails (uncommitted)
- `frontend/src/components/MessageBubble.tsx` — Added attachment display (images inline, PDFs as file icons) in user messages (uncommitted)
- `frontend/src/hooks/useChat.ts` — Updated `sendMessage` to accept and send `attachments[]` (uncommitted)
- `frontend/src/App.tsx` — Updated `handleSend` to pass attachments through the chain (uncommitted)

## Context for Next Session
- **Architecture**: FastAPI backend serves React frontend (Vite build in `frontend/dist/`). Anthropic SDK streams via SSE. SQLite + Fernet encryption for chat history.
- **GenAI Nexus auth**: `api-key` header (UUID format), dummy AWS creds (`unused`/`unused`), endpoint hardcoded in `backend/dependencies.py` line 32
- **Working API key**: Stored in `data/credentials.json`. The key `a1ff434d-0080-4d92-aa40-07c450b04e73` works; `b91a7190-...` gets 403.
- **Theme system**: CSS variables in `frontend/src/index.css`, `data-theme` attribute on `<html>`, persisted in localStorage
- **Retro theme**: Commodore green (#33ff33) on black (#0a0a0a) with scanlines and glow via CSS
- **Server launch**: `BEDROCK_CHAT_PASSPHRASE=otto-bedrock-2026 NO_PROXY="*" python run.py` or double-click `start.vbs`
- **Frontend rebuild needed**: After any `.tsx`/`.css`/`.ts` changes: `cd frontend && npm run build`
- **python-pptx** installed but not used yet (for future PPTX support)
- **File upload debug**: The `event_generator()` in `chat.py` is a generator — logging inside it only runs when the stream is consumed. Move logging before the generator to confirm attachments arrive in the request.

## Git State
- Branch: master
- Last commit: 76ba09f "fix: simplify model settings, read endpoint from credentials.json"
- Uncommitted changes: yes — 8 files for file upload feature (see Files Actively Being Edited)
- Stashed changes: no

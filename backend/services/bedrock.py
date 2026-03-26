"""AWS Bedrock client with streaming via asyncio."""
from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator

import boto3

logger = logging.getLogger(__name__)


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
            self._client = session.client(
                "bedrock-runtime", region_name=self._region
            )
        return self._client

    def _reset_client(self):
        """Force client recreation on credential expiry."""
        self._client = None

    async def stream_chat(
        self,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 8192,
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

        client = self._get_client()
        response = await asyncio.to_thread(client.converse_stream, **kwargs)

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
        """Test AWS credentials and Bedrock access."""
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
            logger.error("Credential validation failed: %s", e)
            return {
                "valid": False,
                "error": "AWS credentials invalid or Bedrock access denied.",
            }

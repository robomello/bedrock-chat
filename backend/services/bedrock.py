"""AWS Bedrock client with streaming via Anthropic SDK."""
from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator

import anthropic

logger = logging.getLogger(__name__)


class BedrockService:
    def __init__(
        self,
        region: str,
        profile: str = "",
        endpoint_url: str = "",
        api_key: str = "",
    ):
        self._region = region
        self._endpoint_url = endpoint_url or ""
        self._api_key = api_key or ""
        self._profile = profile
        self._client = None

    def _get_client(self) -> anthropic.AnthropicBedrock:
        """Lazy client creation."""
        if self._client is None:
            kwargs = {
                "aws_region": self._region,
                "aws_access_key": "unused",
                "aws_secret_key": "unused",
            }
            if self._endpoint_url:
                kwargs["base_url"] = self._endpoint_url
            if self._api_key:
                kwargs["default_headers"] = {"api-key": self._api_key}
            self._client = anthropic.AnthropicBedrock(**kwargs)
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
        """Stream chat response from Bedrock using Anthropic SDK."""
        anthropic_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]

        kwargs = {
            "model": model_id,
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        client = self._get_client()

        def _do_stream():
            chunks = []
            with client.messages.stream(**kwargs) as stream:
                for text in stream.text_stream:
                    chunks.append(text)
            return chunks

        queue: asyncio.Queue = asyncio.Queue()

        def _read_stream():
            try:
                with client.messages.stream(**kwargs) as stream:
                    for text in stream.text_stream:
                        queue.put_nowait(text)
                queue.put_nowait(None)
            except Exception as e:
                queue.put_nowait(e)

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

            def _test():
                return client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=5,
                    messages=[{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
                )

            await asyncio.to_thread(_test)
            return {"valid": True, "error": None}
        except Exception as e:
            self._reset_client()
            logger.error("Credential validation failed: %s", e)
            return {
                "valid": False,
                "error": "AWS credentials invalid or Bedrock access denied.",
            }

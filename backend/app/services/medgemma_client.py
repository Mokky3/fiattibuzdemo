"""
MedGemma 27B client.

This module is a thin, stateless client that sends prompts to an AI
inference service (which actually loads and runs the MedGemma model).

Business / clinical logic MUST live in orchestrators, not here.
"""
from __future__ import annotations

import os
from typing import Dict, Any, List

import httpx


# RunPod / OpenAI-compatible API configuration
# NOTE: Do not default to localhost here. If this is misconfigured we want to fail
# fast rather than silently calling a wrong endpoint.
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "google/medgemma-27b-text-it")
LLM_API_KEY = os.getenv("LLM_API_KEY", "dummy")

# Fallback to old env var name for backward compatibility
if not LLM_BASE_URL:
    fallback = os.getenv("MEDGEMMA_API_URL", "").rstrip("/")
    if fallback:
        LLM_BASE_URL = fallback

if not LLM_BASE_URL:
    raise RuntimeError(
        "LLM_BASE_URL is not configured (set LLM_BASE_URL or MEDGEMMA_API_URL)"
    )


class MedgemmaError(Exception):
    """Raised when the MedGemma inference service returns an error."""


async def chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int = 512,
) -> str:
    """
    Simple async chat function for OpenAI-compatible LLM APIs.

    Args:
        messages: List of {role, content} dicts (system, user, assistant)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens to generate

    Returns:
        Generated text content from the LLM
    """
    # RunPod vLLM OpenAI server uses /v1/chat/completions.
    # Accept either:
    # - base like https://<...>.runpod.net
    # - base like https://<...>.runpod.net/v1
    base = LLM_BASE_URL.rstrip("/")
    if base.endswith("/v1"):
        url = f"{base}/chat/completions"
    else:
        url = f"{base}/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise MedgemmaError(
                f"LLM HTTP error {e.response.status_code}: {e.response.text}"
            ) from e
        except httpx.RequestError as e:
            raise MedgemmaError(f"LLM connection error: {e}") from e


def _build_chat_messages(
    mode: str,
    history: List[Dict[str, str]],
    slots: Dict[str, Any],
    patient_message: str,
) -> List[Dict[str, str]]:
    """
    Build OpenAI-compatible chat messages from orchestrator payload.

    Converts the session history + current message into the format expected
    by RunPod's OpenAI-compatible /chat/completions endpoint.
    """
    messages: List[Dict[str, str]] = []

    # Clinical triage system prompt (same as Telegram bot)
    if mode == "previsit":
        # Pre-visit: collect HPI data
        system_prompt = (
            "Siz tibbiy yordamchi asistent ekansiz. "
            "Bemorning shikoyatlarini yig'ib, previsit ma'lumotlarini to'ldiring. "
            "Savollarni qisqa va aniq qiling."
        )
    elif mode == "recommendation":
        # Recommendation mode: use clinical triage prompt
        system_prompt = """You are a medical triage assistant.
You must provide a SAFE, NON-DIAGNOSTIC explanation of what the patient's symptoms *could suggest*.

ABSOLUTE RULES:
- DO NOT diagnose a specific disease.
- DO NOT say "you have X".
- DO NOT name exact conditions unless phrased as "may be consistent with categories such as…"
- Your job is to summarize patterns and possible categories, and give a recommendation.

Output must be JSON only, in the following format:

{
  "risk_assessment": "...",
  "possible_categories": ["...", "..."],
  "recommendation": "..."
}

Definitions:
- risk_assessment = brief statement about seriousness (mild/moderate/urgent warning).
- possible_categories = symptom clusters (e.g., "musculoskeletal injury", "gastrointestinal irritation", "cardiac-related symptoms", etc.)
- recommendation = what to do next (e.g., "see doctor soon", "emergency evaluation recommended", "bring results to your visit").

Never exceed 3 sentences per field.""".strip()
    else:
        system_prompt = "Siz tibbiy yordamchi asistent ekansiz."

    messages.append({"role": "system", "content": system_prompt})

    # Add conversation history (if any)
    for msg in history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current patient message
    messages.append({"role": "user", "content": patient_message})

    return messages


async def call_medgemma(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call the MedGemma inference service via RunPod's OpenAI-compatible API.

    Args:
        payload: Dict with keys:
            - mode: "previsit" | "recommendation" | "doctor_assist"
            - history: List of {role, content} dicts
            - slots: Dict of extracted slot values
            - patient_message: Current user message

    Returns:
        Dict with keys:
            - assistant_message: Generated response text
            - updated_slots: Updated slot dict (for now, same as input)
            - status: "CONTINUE" | "DONE"
    """
    # LLM_BASE_URL is required (validated at import-time). No silent stubs here; if
    # you want a local stub, set up a dev-only config explicitly.

    # Build OpenAI-compatible chat messages
    messages = _build_chat_messages(
        mode=payload.get("mode", "previsit"),
        history=payload.get("history", []),
        slots=payload.get("slots", {}),
        patient_message=payload.get("patient_message", ""),
    )

    # Call the simple chat function
    try:
        assistant_text = await chat(messages, temperature=0.2, max_tokens=512)
    except MedgemmaError:
        # Fallback on error
        assistant_text = "Kechirasiz, xatolik yuz berdi. Qayta urinib ko'ring."

    # For now, slots and status logic is simplified
    # TODO: Add slot extraction from LLM response if needed
    slots = payload.get("slots", {})
    status = "CONTINUE"  # TODO: Detect "DONE" from LLM response or orchestrator logic

    return {
        "assistant_message": assistant_text.strip(),
        "updated_slots": slots,
        "status": status,
    }



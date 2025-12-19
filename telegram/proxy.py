from __future__ import annotations
import base64
import io
import json
import os
import time
from typing import Any, Dict, Optional

import requests
from fastapi import FastAPI, Header, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from google.oauth2 import service_account
from google.auth.transport.requests import Request

# ---------- ENV ----------
PROJECT_ID = os.getenv("PROJECT_ID")
REGION = os.getenv("REGION", "europe-west4")
ENDPOINT_ID = os.getenv("ENDPOINT_ID")
USE_DEDICATED_DNS = os.getenv("USE_DEDICATED_DNS", "0") in {"1", "true", "True"}
PROJECT_NUMBER = os.getenv("PROJECT_NUMBER", "")
PROXY_API_KEY = os.getenv("PROXY_API_KEY")
SA_KEY_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not all([PROJECT_ID, ENDPOINT_ID, PROXY_API_KEY, SA_KEY_FILE]):
    raise SystemExit(
        "Set PROJECT_ID, ENDPOINT_ID, PROXY_API_KEY, GOOGLE_APPLICATION_CREDENTIALS in env"
    )

if USE_DEDICATED_DNS and PROJECT_NUMBER:
    HOST = f"https://{ENDPOINT_ID}.{REGION}-{PROJECT_NUMBER}.prediction.vertexai.goog"
else:
    HOST = f"https://{REGION}-aiplatform.googleapis.com"

PREDICT_URL = (
    f"{HOST}/v1/projects/{PROJECT_ID}/locations/{REGION}/endpoints/{ENDPOINT_ID}:predict"
)

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

# ---------- FastAPI ----------
app = FastAPI(title="MedGemma Vision Proxy (422‑tolerant)")


class InferPayload(BaseModel):
    # All optional on purpose so FastAPI doesn't 422 before we massage the input
    prompt: Optional[str] = None
    image_base64: Optional[str] = None
    image_b64: Optional[str] = None
    image: Optional[Dict[str, Any]] = None  # e.g., {"bytesBase64Encoded": "..."}
    image_url: Optional[str] = None


_token_cache: Dict[str, Any] = {"token": None, "exp": 0.0}


def _get_access_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["exp"] - 60:
        return _token_cache["token"]
    creds = service_account.Credentials.from_service_account_file(SA_KEY_FILE, scopes=SCOPES)
    creds.refresh(Request())
    # default token lifetime ~3600s
    _token_cache["token"] = creds.token
    _token_cache["exp"] = now + 3600
    return _token_cache["token"]


def _ensure_b64_from_payload(body: InferPayload) -> str:
    # 1) direct fields
    b64 = body.image_base64 or body.image_b64
    # 2) image dict keys
    if not b64 and isinstance(body.image, dict):
        b64 = (
            body.image.get("bytesBase64Encoded")
            or body.image.get("base64")
            or body.image.get("bytes")
        )
    # 3) URL fetch
    if not b64 and body.image_url:
        try:
            r = requests.get(body.image_url, timeout=15)
            r.raise_for_status()
            b64 = base64.b64encode(r.content).decode("utf-8")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image_url: {e}")

    if not b64:
        raise HTTPException(
            status_code=400,
            detail=(
                "Provide image_base64 (or image_b64 or image.bytesBase64Encoded) "
                "or a valid image_url"
            ),
        )

    # quick sanity decode
    try:
        _ = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="image_base64 is not valid base64")

    return b64


def _build_instances(prompt: str, image_b64: str) -> Dict[str, Any]:
    return {
        "instances": [
            {
                "prompt": prompt,
                "image": {"bytesBase64Encoded": image_b64},
            }
        ]
        # , "parameters": {"temperature": 0.2}
    }


def _extract_text(resp_json: Dict[str, Any]) -> str:
    # 1) predictions[0] as dict with common text keys
    try:
        preds = resp_json.get("predictions")
        if preds:
            p0 = preds[0]
            if isinstance(p0, dict):
                for key in ("output_text", "text", "reply", "content", "generated_text"):
                    if key in p0 and p0[key]:
                        return str(p0[key])
            # 2) predictions is list[str]
            if isinstance(p0, str):
                return p0
    except Exception:
        pass
    # Fallback: return raw json (useful for debugging)
    return json.dumps(resp_json)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "endpoint": PREDICT_URL}


@app.post("/infer")
def infer(body: InferPayload, authorization: str = Header(default="")):
    # Auth
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != PROXY_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    # prompt
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # image
    image_b64 = _ensure_b64_from_payload(body)

    # Call Vertex
    access_token = _get_access_token()
    payload = _build_instances(prompt, image_b64)
    r = requests.post(
        PREDICT_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    text = _extract_text(r.json())
    return {"reply": text}


@app.post("/infer-multipart")
def infer_multipart(
    prompt: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(default=""),
):
    # Auth
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != PROXY_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Read file and convert to base64
    try:
        data = file.file.read()
    finally:
        file.file.close()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    image_b64 = base64.b64encode(data).decode("utf-8")

    # Call Vertex
    access_token = _get_access_token()
    payload = _build_instances(prompt, image_b64)
    r = requests.post(
        PREDICT_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    text = _extract_text(r.json())
    return {"reply": text}

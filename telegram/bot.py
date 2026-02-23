from __future__ import annotations
import asyncio
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin


from dotenv import load_dotenv
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
)
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    PicklePersistence,
    filters,
)
# NEW: robust HTTP client for Telegram with timeouts/proxy
from telegram.request import HTTPXRequest

# ---------------------------
# Config & Globals
# ---------------------------
# IMPORTANT: always load the .env located next to this file (telegram/.env),
# and override any existing process environment variables. This avoids cases
# where an old LLM_BASE_URL from a different shell/session keeps being used.
_DOTENV_PATH = Path(__file__).resolve().with_name(".env")
load_dotenv(dotenv_path=_DOTENV_PATH, override=True)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SERVICE_URL = os.getenv("SERVICE_URL")  # optional general service URL
HF_TOKEN = os.getenv("HF_TOKEN")

# NEW: LLM endpoint/env (RunPod vLLM OpenAI-compatible)
# Keep legacy env var names for backward compatibility, but do not silently fall back
# to unrelated SERVICE_URL.
MEDGEMMA_ENDPOINT_URL = os.getenv("MEDGEMMA_ENDPOINT_URL")
MEDGEMMA_API_KEY = os.getenv("MEDGEMMA_API_KEY")

# NEW: Network hardening for Telegram API
HTTP_PROXY = os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")  # e.g. http://user:pass@host:port
TG_READ_TIMEOUT = float(os.getenv("TG_READ_TIMEOUT", "60"))
TG_CONNECT_TIMEOUT = float(os.getenv("TG_CONNECT_TIMEOUT", "30"))
TG_WRITE_TIMEOUT = float(os.getenv("TG_WRITE_TIMEOUT", "60"))
TG_POOL_TIMEOUT = float(os.getenv("TG_POOL_TIMEOUT", "30"))

if not BOT_TOKEN:
    raise SystemExit("❌ TELEGRAM_BOT_TOKEN is missing. Put it in .env")

# Modes
MODE_NONE = "none"
MODE_ANALYZE = "analyze"
MODE_CHAT = "chat"
MODE_LINK = "link"

# Localization
LANGS = {
    "uz": "O‘zbekcha",
    "ru": "Русский",
    "en": "English",
}

TEXT: Dict[str, Dict[str, str]] = {
    "choose_language": {
        "uz": "Iltimos, tilni tanlang:",
        "ru": "Пожалуйста, выберите язык:",
        "en": "Please choose your language:",
    },
    "welcome": {
        "uz": "Salom, {name}! Men FIATTIB yordamchisiman.",
        "ru": "Привет, {name}! Я помощник FIATTIB.",
        "en": "Hi, {name}! I’m the FIATTIB assistant.",
    },
    "how_help": {
        "uz": "Qanday yordam bera olaman?",
        "ru": "Чем могу помочь?",
        "en": "How can I help today?",
    },
    "btn_analyze": {"uz": "🖼️ Rasmni tahlil qilish", "ru": "🖼️ Анализ изображения", "en": "🖼️ Analyze image"},
    "btn_chat": {"uz": "👨‍⚕️ Tabib bilan maslahat", "ru": "👨‍⚕️ Консультация с врачом", "en": "👨‍⚕️ Consult with tabib"},
    "btn_link": {"uz": "📱 Telefonni bog‘lash", "ru": "📱 Привязать телефон", "en": "📱 Link phone"},
    "btn_appts": {"uz": "📅 Mening uchrashuvlarim", "ru": "📅 Мои приёмы", "en": "📅 My appointments"},
    "btn_reports": {"uz": "📑 Mening hisobotlarim", "ru": "📑 Мои отчёты", "en": "📑 My reports"},
    "btn_make_appt": {"uz": "🗓️ Qabulga yozilish", "ru": "🗓️ Записаться на приём", "en": "🗓️ Make appointment"},
    "btn_back": {"uz": "⬅️ Asosiy menyu", "ru": "⬅️ Главное меню", "en": "⬅️ Main menu"},
    "btn_finish_chat": {
        "uz": "✅ Chatni yakunlash",
        "ru": "✅ Завершить чат",
        "en": "✅ Finish chat",
    },
    "make_appt": {
        "uz": "Qabulga yozilish uchun quyidagi havoladan foydalaning:\n{url}",
        "ru": "Чтобы записаться на приём, используйте ссылку:\n{url}",
        "en": "To make an appointment, use this link:\n{url}",
    },
    "choose_department": {
        "uz": "Bo‘limni tanlang:",
        "ru": "Выберите отделение:",
        "en": "Choose a department:",
    },
    "make_appt_no_url": {
        "uz": "Qabulga yozilish uchun qabulxonaga murojaat qiling.",
        "ru": "Чтобы записаться на приём, обратитесь в регистратуру.",
        "en": "To make an appointment, please contact reception.",
    },
    "ask_send_image": {
        "uz": "Iltimos, tahlil uchun rasm yuboring. DICOM fayllari (.dcm)ni ‘file’ sifatida jo‘nating.",
        "ru": "Отправьте изображение для анализа. DICOM (.dcm) отправляйте как файл.",
        "en": "Please send an image to analyze. Send DICOM (.dcm) as a file (not compressed).",
    },
    "processing_image": {
        "uz": "Rasm tahlil qilinmoqda…",
        "ru": "Идёт анализ изображения…",
        "en": "Analyzing the image…",
    },
    "image_result": {
        "uz": "Natija: {summary}\nEslatma: bu tibbiy maslahat emas.",
        "ru": "Результат: {summary}\nПримечание: это не является медицинским советом.",
        "en": "Result: {summary}\nNote: this is not medical advice.",
    },
    "enter_message": {
        "uz": "Tabib bilan yozing. Yakunlash uchun ✅ Chatni yakunlash tugmasini bosing yoki /end yozing.",
        "ru": "Пишите врачу. Чтобы завершить — нажмите ✅ Завершить чат или /end.",
        "en": "Chat with tabib. To finish, press ✅ Finish chat or type /end.",
    },
    "ask_phone": {
        "uz": "Telefon raqamingizni kiriting (+998...)",
        "ru": "Введите ваш номер телефона (+998...)",
        "en": "Please enter your phone number (+998...)",
    },
    "link_success": {
        "uz": "Bog‘landi: {name}\nEndi uchrashuvlar va hisobotlarni olishingiz mumkin.",
        "ru": "Привязано: {name}\nТеперь можно получать приёмы и отчёты.",
        "en": "Linked: {name}\nYou can now fetch appointments and reports.",
    },
    "link_failed": {
        "uz": "Raqam topilmadi. Iltimos, qabulxonaga murojaat qiling yoki qayta urinib ko‘ring.",
        "ru": "Номер не найден. Обратитесь в регистратуру или попробуйте снова.",
        "en": "Phone not found. Contact reception or try again.",
    },
    "need_link_first": {
        "uz": "Avval telefon raqamini bog‘lang.",
        "ru": "Сначала привяжите телефон.",
        "en": "Please link your phone first.",
    },
    "fetching": {
        "uz": "Yuklanmoqda...",
        "ru": "Загружается...",
        "en": "Fetching...",
    },
    "no_appts": {
        "uz": "Uchrashuvlar topilmadi.",
        "ru": "Приёмов не найдено.",
        "en": "No appointments found.",
    },
    "no_reports": {
        "uz": "Hisobotlar topilmadi.",
        "ru": "Отчёты не найдены.",
        "en": "No reports found.",
    },
    "chat_reply_prefix": {
        "uz": "Javob:",
        "ru": "Ответ:",
        "en": "Reply:",
    },
    "chat_disclaimer": {
        "uz": "Eslatma: bu tibbiy maslahat emas.",
        "ru": "Примечание: это не медицинский совет.",
        "en": "Note: this is not medical advice.",
    },
    "help": {
        "uz": "Mavjud buyruqlar: /start /lang /help /end",
        "ru": "Доступные команды: /start /lang /help /end",
        "en": "Available commands: /start /lang /help /end",
    },
}

# ---------------------------
# Helpers
# ---------------------------

def user_lang(data: Dict[str, Any]) -> str:
    return data.get("lang", "uz")  # default to Uzbek for FIATTIB

def t(data: Dict[str, Any], key: str) -> str:
    lang = user_lang(data)
    return TEXT.get(key, {}).get(lang, TEXT.get(key, {}).get("en", key))

def main_menu_kb(data: Dict[str, Any]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(text=t(data, "btn_analyze"), callback_data="menu_analyze")],
        [InlineKeyboardButton(text=t(data, "btn_chat"), callback_data="menu_chat")],
        [InlineKeyboardButton(text=t(data, "btn_link"), callback_data="menu_link")],
        [InlineKeyboardButton(text=t(data, "btn_make_appt"), callback_data="menu_make_appt")],
        [InlineKeyboardButton(text=t(data, "btn_appts"), callback_data="menu_appts")],
        [InlineKeyboardButton(text=t(data, "btn_reports"), callback_data="menu_reports")],
    ])

def lang_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("O‘zbekcha", callback_data="lang_uz"),
        InlineKeyboardButton("Русский", callback_data="lang_ru"),
        InlineKeyboardButton("English", callback_data="lang_en"),
    ]])

def back_kb(data: Dict[str, Any]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[InlineKeyboardButton(text=t(data, "btn_back"), callback_data="menu_back")]])

def chat_kb(data: Dict[str, Any]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton(text=t(data, "btn_finish_chat"), callback_data="chat_finish")],
            [InlineKeyboardButton(text=t(data, "btn_back"), callback_data="menu_back")],
        ]
    )

def contact_kb(data: Dict[str, Any]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [[KeyboardButton(text=t(data, "btn_link"), request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )

def chat_reply_kb(data: Dict[str, Any]) -> ReplyKeyboardMarkup:
    """
    Chat mode uses a reply keyboard so the user always has a visible "Finish chat"
    button (instead of the link-phone contact keyboard).
    """
    return ReplyKeyboardMarkup(
        [[KeyboardButton(text=t(data, "btn_finish_chat"))]],
        resize_keyboard=True,
        one_time_keyboard=False,
    )

async def _exit_link_mode_show_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Reply keyboards (contact share) can persist. Always remove them when leaving link mode.
    """
    context.user_data["mode"] = MODE_NONE
    # First remove reply keyboard, then show menu (inline keyboard).
    await update.effective_message.reply_text("✅", reply_markup=ReplyKeyboardRemove())
    await update.effective_message.reply_text(
        t(context.user_data, "how_help"),
        reply_markup=main_menu_kb(context.user_data),
    )

async def send_typing(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    except Exception:
        pass

# ---------------------------
# Inference placeholders (replace with real logic)
# ---------------------------
import json
import time
import random
import requests

SLOT_EXTRACT_SYSTEM = """
You extract structured medical intake slots from the latest patient message.

Rules:
- Output JSON only.
- Only include fields you are confident about. If unknown, omit the key.
- Keep values short.

Schema:
{
  "chief_complaint": "string",
  "duration": "string",
  "onset": "string",
  "severity_0_10": number,
  "location": "string",
  "quality": "string",
  "associated_symptoms": ["..."],
  "temperature_c": number,
  "pregnant": true|false,
  "age": number,
  "sex": "male|female|other",
  "pmh": ["..."],
  "meds": ["..."],
  "allergies": ["..."]
}
""".strip()

EXTRACTOR_SYSTEM = """
You extract clinical facts from the latest message.

Rules:
- Output JSON only.
- Extract ALL symptoms mentioned in the message (multiple allowed).
- Convert simple Uzbek answers into structured values:
  - "2 kun" -> duration_days: 2
  - "yo'q/yoq" -> false
  - "ha" -> true

Schema:
{
  "chief_complaint": "string|null",
  "symptoms": ["..."],
  "duration_days": number|null,
  "vomiting": true|false|null,
  "dizziness": true|false|null,
  "appetite_loss": true|false|null,
  "fever": true|false|null,
  "abdominal_pain": true|false|null
}
""".strip()

RECOMMENDER_SYSTEM_UZ = """
You are a medical triage assistant. NON-DIAGNOSTIC.

Rules:
- No diagnosis. No “you have X”.
- Provide categories only.
- Be specific and actionable.

Output JSON only:
{
  "risk_assessment": "...",
  "possible_categories": ["...", "..."],
  "self_care_now": ["...", "...", "..."],
  "seek_care_when": {
    "emergency_now": ["...", "..."],
    "same_day": ["...", "..."],
    "routine": ["..."]
  }
}

Constraints:
- Each list item must be short and concrete.
- self_care_now must include hydration guidance and what to avoid when relevant.
- If urgent, still include self_care_now and specific red flags.
Respond in Uzbek.
""".strip()

ROUTER_SYSTEM_UZ = """
You are a medical conversation router for FIATTIB.

Choose ONE mode:
- qa: user asks a direct question (what to do, can I take X, how to treat, what does it mean).
  Answer immediately. Ask at most ONE clarifying question only if absolutely needed for safety.
- intake: user reports symptoms without asking for advice; collect information step-by-step (one question).
- recommendation: user is asking for advice OR enough info is already available; produce recommendation now (do not ask more questions).

Rules:
- Never diagnose.
- Output JSON only:
{
  "mode": "qa|intake|recommendation",
  "confidence": number,
  "answer_now": string|null,
  "next_question": string|null,
  "done": boolean
}
Language: Uzbek.
""".strip()

CONTROLLER_SYSTEM = """
You are a medical pre-visit intake + triage assistant.

You must do TWO things:
1) Ask the best next question(s) ONE AT A TIME to collect enough info.
2) When enough info is collected, produce a SAFE non-diagnostic recommendation in JSON.

ABSOLUTE RULES:
- NO diagnosis. Never say “you have X”.
- You MAY mention broad categories only (e.g., urinary/skin/musculoskeletal).
- Ask ONLY ONE question per turn.
- Do NOT repeat a question if the answer is already provided.
- Be specific and high-yield.
- If urgent red flags are present, set done=true and recommend urgent evaluation.

STOP CONDITIONS (MANDATORY):
- Never ask more than {MAX_QUESTIONS} total questions. If question_count >= max_questions: set done=true.
- Never ask the same question twice, even with different wording.
- You are STRICTLY FORBIDDEN from asking any question semantically similar to any item in asked_questions.
- If the user answers “doimiy”, “yo‘q”, or “har doim” (or equivalents) treat it as a COMPLETE answer.

PHASES (MANDATORY):
- Phase 1 = INTERVIEW (facts only): collect facts, DO NOT analyze patterns, DO NOT refine already-answered symptoms.
- Phase 2 = RECOMMENDATION: only when done=true. Provide final_recommendation JSON.

OUTPUT: JSON ONLY in this exact schema:
{
  "done": boolean,
  "next_question": string|null,
  "slots_update": object,
  "hpi_compact": object,
  "final_recommendation": {
    "risk_assessment": string,
    "possible_categories": array of string,
    "recommendation": string
  }
}

Field rules:
- If done=false: next_question must be a string, final_recommendation can be empty strings/[].
- If done=true: next_question must be null, final_recommendation must be filled.
- Keep each final_recommendation field <= 3 sentences.
- Respond in the user's language: {LANG}.
""".strip()

def _strip_fences(s: str) -> str:
    t = (s or "").strip()
    if t.startswith("```"):
        t = t.strip("`").strip()
        if t.lower().startswith("json"):
            t = t[4:].strip()
    return t


def _norm_q(s: str) -> str:
    s = (s or "").strip().lower()
    # cheap normalization: keep letters/numbers/spaces only
    out = []
    for ch in s:
        if ch.isalnum() or ch.isspace():
            out.append(ch)
        else:
            out.append(" ")
    return " ".join("".join(out).split())


def _is_repeat_question(q: str, asked: list[str]) -> bool:
    nq = _norm_q(q)
    if not nq:
        return False
    for a in asked or []:
        na = _norm_q(a)
        if not na:
            continue
        if nq == na:
            return True
        # containment heuristic
        if nq in na or na in nq:
            return True
    return False


def extract_slots_from_message(user_text: str, current_slots: dict) -> dict:
    payload = {"text": user_text, "current_slots": current_slots}
    raw = _call_llm(
        [
            {"role": "system", "content": EXTRACTOR_SYSTEM},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
        max_tokens=220,
    )
    try:
        txt = raw.strip()
        if txt.startswith("```"):
            txt = txt.strip("`").replace("json\n", "").replace("JSON\n", "", 1).strip()
        return json.loads(txt)
    except Exception:
        return {}


def generate_actionable_recommendation_uz(hpi_payload: dict) -> dict:
    raw = _call_llm(
        [
            {"role": "system", "content": RECOMMENDER_SYSTEM_UZ},
            {"role": "user", "content": json.dumps(hpi_payload, ensure_ascii=False)},
        ],
        max_tokens=420,
    )
    try:
        txt = raw.strip()
        if txt.startswith("```"):
            txt = txt.strip("`").replace("json\n", "").replace("JSON\n", "", 1).strip()
        parsed = json.loads(txt)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def route_mode(user_text: str, language: str, state: dict) -> dict:
    payload = {
        "latest_user_message": user_text,
        "current_slots": (state or {}).get("slots", {}),
        "recent_transcript": ((state or {}).get("transcript", []) or [])[-10:],
    }
    raw = _call_llm(
        [
            {"role": "system", "content": ROUTER_SYSTEM_UZ},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
        max_tokens=220,
    )
    try:
        txt = raw.strip()
        if txt.startswith("```"):
            txt = txt.strip("`").replace("json\n", "").replace("JSON\n", "", 1).strip()
        parsed = json.loads(txt)
        if isinstance(parsed, dict) and parsed.get("mode") in {"qa", "intake", "recommendation"}:
            return parsed
    except Exception:
        pass
    return {"mode": "intake", "confidence": 0.0, "answer_now": None, "next_question": None, "done": False}


def ai_controller_step(user_text: str, state: dict, language: str) -> dict:
    """
    state = {
      "slots": {...},
      "transcript": [ {"role":"user/assistant","content":"..."} ... ]  # short
    }
    """
    state = state or {}
    slots = state.get("slots") or {}
    transcript = state.get("transcript") or []
    asked_questions = state.get("asked_questions") or []
    question_count = int(state.get("question_count") or 0)
    max_questions = int(state.get("max_questions") or 6)

    # keep only last N turns to avoid context bloat
    transcript = transcript[-10:]

    # Extractor step BEFORE questioning: capture multiple symptoms from one message
    try:
        extractor_updates = extract_slots_from_message(user_text, slots)
        if isinstance(extractor_updates, dict) and extractor_updates:
            slots.update({k: v for k, v in extractor_updates.items() if v is not None})
    except Exception:
        pass

    user_payload = {
        "latest_user_message": user_text,
        "current_slots": slots,
        "recent_transcript": transcript,
        "asked_questions": asked_questions,
        "question_count": question_count,
        "max_questions": max_questions,
    }

    messages = [
        {
            "role": "system",
            "content": CONTROLLER_SYSTEM.replace("{LANG}", language)
            .replace("{MAX_QUESTIONS}", str(max_questions)),
        },
        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
    ]

    raw = _call_llm(messages, max_tokens=500)

    # parse JSON with one retry if needed
    parsed = None
    for _ in range(2):
        try:
            parsed = json.loads(_strip_fences(raw))
            break
        except Exception:
            # IMPORTANT: vLLM enforces strict role alternation (system, user, assistant, user...).
            # Do NOT append another user message (system,user,user). Instead, strengthen the
            # existing single user message and retry with (system,user).
            retry_messages = [
                messages[0],
                {
                    "role": "user",
                    "content": (
                        json.dumps(user_payload, ensure_ascii=False)
                        + "\n\nReturn JSON only. No markdown. No extra text."
                    ),
                },
            ]
            raw = _call_llm(retry_messages, max_tokens=500)
            parsed = None

    if not parsed:
        return {"type": "error", "content": "Tabib xatosi: JSON parse failed", "state": state}

    # merge slots
    slots_update = parsed.get("slots_update") or {}
    if isinstance(slots_update, dict):
        slots.update(slots_update)

    # update transcript (for anti-repeat + context)
    transcript.append({"role": "user", "content": user_text})
    # store assistant question or a short marker
    if parsed.get("done") is False:
        q = (parsed.get("next_question") or "").strip()
        # hard stop: if max question limit reached, force done on next step by asking model
        if question_count >= max_questions:
            parsed["done"] = True
        elif q:
            # avoid repeats even if model misbehaves
            if _is_repeat_question(q, asked_questions):
                parsed["done"] = True  # break loops; recommendation will follow
            else:
                asked_questions.append(q)
                question_count += 1
                transcript.append({"role": "assistant", "content": q})
    else:
        fr = parsed.get("final_recommendation") or {}
        transcript.append({"role": "assistant", "content": json.dumps(fr, ensure_ascii=False)})

    new_state = {
        "slots": slots,
        "transcript": transcript,
        "asked_questions": asked_questions,
        "question_count": question_count,
        "max_questions": max_questions,
    }

    # produce result
    if parsed.get("done") is False:
        q = parsed.get("next_question") or ""
        return {"type": "question", "content": q, "state": new_state}

    fr = parsed.get("final_recommendation") or {}

    # If Uzbek, enrich into actionable schema via separate recommender call
    if language == "uz":
        actionable = generate_actionable_recommendation_uz(
            {
                "latest_user_message": user_text,
                "slots": slots,
                "controller_final_recommendation": fr,
            }
        )
        if actionable:
            return {"type": "recommendation", "content": actionable, "state": new_state}

    return {"type": "recommendation", "content": fr, "state": new_state}


def extract_slots(latest_text: str, language: str, current_slots: dict) -> dict:
    user_prompt = f"""
Current slots:
{json.dumps(current_slots, ensure_ascii=False, indent=2)}

Latest patient message ({language}):
{latest_text}

Return JSON only with slot updates.
""".strip()
    raw = _call_llm(
        [
            {"role": "system", "content": SLOT_EXTRACT_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=220,
    )
    try:
        txt = raw.strip()
        if txt.startswith("```"):
            txt = txt.strip("`").replace("json\n", "").replace("JSON\n", "", 1).strip()
        return json.loads(txt)
    except Exception:
        return {}


def red_flag_check(slots: dict) -> list[str]:
    cc = (slots.get("chief_complaint") or "").lower()
    assoc = [s.lower() for s in slots.get("associated_symptoms", [])]

    red: list[str] = []
    sev = slots.get("severity_0_10")
    if "chest" in cc or "ko'krak" in cc or "груд" in cc:
        if sev is not None and sev >= 8:
            red.append("Severe chest pain")
        if any(x in assoc for x in ["shortness of breath", "nafas qisilishi", "одышка"]):
            red.append("Chest pain with shortness of breath")

    if any(x in cc for x in ["faint", "hushidan", "потеря сознания"]):
        red.append("Fainting / loss of consciousness")

    return red


def next_question(slots: dict, language: str) -> str | None:
    # Ask ONE thing at a time
    if not slots.get("chief_complaint"):
        return {
            "uz": "Asosiy shikoyatingiz nima? (Masalan: bosh og‘riq, qorin og‘riq, yo‘tal)",
            "ru": "Какая у вас основная жалоба? (Например: головная боль, боль в животе, кашель)",
            "en": "What is your main complaint? (e.g., headache, stomach pain, cough)",
        }.get(language, "Asosiy shikoyatingiz nima? (Masalan: bosh og‘riq, qorin og‘riq, yo‘tal)")

    if not slots.get("duration"):
        return {
            "uz": "Qancha vaqtdan beri bu muammo bor? (Masalan: 2 kun, 1 hafta)",
            "ru": "Как давно это началось? (Например: 2 дня, 1 неделя)",
            "en": "How long has this been going on? (e.g., 2 days, 1 week)",
        }.get(language, "Qancha vaqtdan beri bu muammo bor? (Masalan: 2 kun, 1 hafta)")

    if slots.get("severity_0_10") is None:
        return {
            "uz": "Og‘riq/bezovtalik kuchi 0–10 oralig‘ida nechchi? (0=yo‘q, 10=eng kuchli)",
            "ru": "Оцените боль/дискомфорт по шкале 0–10 (0=нет, 10=максимум)",
            "en": "Rate the pain/discomfort from 0–10 (0=none, 10=worst).",
        }.get(language, "Og‘riq/bezovtalik kuchi 0–10 oralig‘ida nechchi? (0=yo‘q, 10=eng kuchli)")

    # complaint-specific 1 question (example)
    cc = (slots.get("chief_complaint") or "").lower()
    if "chest" in cc or "ko'krak" in cc or "груд" in cc:
        return {
            "uz": "Nafas qisilishi, sovuq ter, ko‘ngil aynishi yoki hushdan ketish bo‘ldimi?",
            "ru": "Есть ли одышка, холодный пот, тошнота или обморок?",
            "en": "Any shortness of breath, cold sweat, nausea, or fainting?",
        }.get(language, "Nafas qisilishi, sovuq ter, ko‘ngil aynishi yoki hushdan ketish bo‘ldimi?")

    # If you have enough, return None (move to recommendation)
    return None


def heuristic_slot_patch(text: str, language: str) -> dict:
    t = (text or "").strip().lower()
    if language == "uz":
        if t in {"hozir", "hozir bo'ldi", "hozir buldi", "endi", "endi boshlandi", "hozirgina"}:
            return {"duration": "just now", "onset": "today"}
        if any(x in t for x in ["kun", "hafta", "oy", "yil", "soat", "daqiq"]):
            return {"duration": text.strip()}
        if t in {"og'riq yoq", "ogiriq yoq", "yoq", "yo‘q", "og'riq yo‘q", "og‘riq yo‘q", "og'riq yo'q", "yo'q"}:
            return {"severity_0_10": 0, "pain_present": False}
        if t in {"ha", "bor"}:
            return {"pain_present": True}

    if language == "ru":
        if t in {"только что", "сейчас", "сейчас началось"}:
            return {"duration": "just now", "onset": "today"}

    if language == "en":
        if t in {"just now", "now", "started now", "started today"}:
            return {"duration": "just now", "onset": "today"}

    return {}


def run_monai_inference(local_path: Path) -> Dict[str, Any]:
    # Fake result (kept as-is)
    time.sleep(1.0)
    findings = [
        {"label": "No obvious anomaly", "score": 0.05},
        {"label": "Possible lesion", "score": 0.62},
        {"label": "Artifact", "score": 0.18},
    ]
    result = random.choice(findings)
    return {"summary": f"{result['label']} (confidence {result['score']:.2f})"}

from urllib.parse import urljoin
import time
import requests

def _call_llm(messages: List[Dict[str, str]], max_tokens: int = 512) -> str:
    """Helper to call RunPod LLM with messages."""
    import json
    
    # Validate messages format
    if not messages or not isinstance(messages, list):
        raise ValueError("Messages must be a non-empty list")
    
    # Ensure each message has role and content
    validated_messages = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        if "role" not in msg or "content" not in msg:
            continue
        if not msg.get("content") or not msg.get("role"):
            continue
        validated_messages.append({
            "role": str(msg["role"]),
            "content": str(msg["content"])
        })
    
    if not validated_messages:
        raise ValueError("No valid messages found")
    
    messages = validated_messages
    
    llm_base_url = os.getenv("LLM_BASE_URL", "").rstrip("/")
    llm_model = os.getenv("LLM_MODEL", "google/medgemma-27b-text-it")
    llm_api_key = os.getenv("LLM_API_KEY", "dummy")
    
    if not llm_base_url:
        # Backward compatible fallback
        llm_base_url = os.getenv("MEDGEMMA_API_URL", "").rstrip("/") or os.getenv("MEDGEMMA_ENDPOINT_URL", "").rstrip("/")
    
    if not llm_base_url:
        raise ValueError("LLM_BASE_URL not configured")

    # Build URL (RunPod vLLM OpenAI server)
    base_clean = llm_base_url.rstrip("/")
    # Accept multiple styles of LLM_BASE_URL:
    # - https://<host>
    # - https://<host>/v1
    # - https://<host>/v1/chat/completions
    # - https://<host>/chat/completions
    if base_clean.endswith("/v1/chat/completions") or base_clean.endswith("/chat/completions"):
        url = base_clean
    elif base_clean.endswith("/v1"):
        url = f"{base_clean}/chat/completions"
    else:
        url = f"{base_clean}/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {llm_api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": llm_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }

    timeout = int(os.getenv("MEDGEMMA_READ_TIMEOUT", "120"))

    r = requests.post(url, headers=headers, json=payload, timeout=timeout)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Return server error body to help debugging, but don't try random endpoints.
        body = ""
        try:
            body = (r.text or "").strip()
        except Exception:
            body = ""
        raise ValueError(f"LLM API error {r.status_code} at {url}: {body[:800]}") from e

    data = r.json()
    if "choices" in data and len(data["choices"]) > 0:
        return data["choices"][0].get("message", {}).get("content", "").strip()
    return data.get("text", data.get("reply", data.get("response", ""))).strip()


def ask_medgemma(
    user_id: int,
    text: str,
    *,
    hpi_data: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "uz",
) -> Dict[str, Any]:
    """
    Call RunPod MedGemma for clinical consultation.
    
    Flow:
    1. First message: Ask 2-3 follow-up questions
    2. After questions: Provide recommendation with JSON format
    
    Returns:
        {
            "type": "question" | "recommendation",
            "content": str (question text or formatted recommendation),
            "hpi_data": dict (accumulated HPI data)
        }
    """
    import json
    
    if conversation_history is None:
        conversation_history = []

    # Initialize structured HPI state (kept in context.user_data["hpi_data"])
    if not hpi_data:
        hpi_data = {
            "chief_complaint": None,
            "slots": {},
            "rolling_summary": "",
            "turns": 0,
            # keep responses list for now because prompts depend on it
            "responses": [],
            "source": "telegram_chat",
        }

    # Update structured state from this user message
    if not hpi_data.get("chief_complaint"):
        hpi_data["chief_complaint"] = text
    else:
        hpi_data["responses"] = hpi_data.get("responses", [])
        hpi_data["responses"].append(text)
    hpi_data["turns"] = int(hpi_data.get("turns", 0)) + 1

    # AI controller (single model call per turn)
    # Minimal control logic: heuristics (to prevent loops) + JSON parsing + state updates.
    slots = hpi_data.get("slots") or {}
    try:
        slots.update(heuristic_slot_patch(text, language))
    except Exception:
        pass
    hpi_data["slots"] = slots

    lang = language if language in {"uz", "ru", "en"} else "uz"
    controller_system = CONTROLLER_SYSTEM.format(LANG=lang)

    controller_user = f"""
Conversation state:
- turns: {hpi_data.get("turns", 0)}
- chief_complaint: {hpi_data.get("chief_complaint")}

Current slots:
{json.dumps(hpi_data.get("slots", {}), ensure_ascii=False, indent=2)}

Current hpi_compact (may be empty):
{json.dumps(hpi_data.get("hpi_compact", {}), ensure_ascii=False, indent=2)}

Chat history (role/content):
{json.dumps(conversation_history[-14:], ensure_ascii=False, indent=2)}

Latest patient message ({lang}):
{text}
""".strip()

    try:
        raw = _call_llm(
            [
                {"role": "system", "content": controller_system},
                {"role": "user", "content": controller_user},
            ],
            max_tokens=420,
        )
        txt = raw.strip()
        if txt.startswith("```"):
            txt = txt.strip("`").replace("json\n", "").replace("JSON\n", "", 1).strip()
        controller = json.loads(txt)
    except Exception:
        controller = {}

    if isinstance(controller, dict) and ("done" in controller or "next_question" in controller):
        # Apply state updates
        slots_update = controller.get("slots_update") if isinstance(controller.get("slots_update"), dict) else {}
        if slots_update:
            hpi_data["slots"] = {**(hpi_data.get("slots") or {}), **slots_update}
        hpi_compact = controller.get("hpi_compact") if isinstance(controller.get("hpi_compact"), dict) else {}
        if hpi_compact:
            hpi_data["hpi_compact"] = hpi_compact

        done = bool(controller.get("done", False))
        if not done:
            q = controller.get("next_question")
            if isinstance(q, str) and q.strip():
                return {"type": "question", "content": q.strip(), "hpi_data": hpi_data}

        # done==true -> format final recommendation (JSON fields)
        fr = controller.get("final_recommendation") if isinstance(controller.get("final_recommendation"), dict) else {}
        risk = (fr.get("risk_assessment") or "").strip()
        cats = fr.get("possible_categories") or []
        rec = (fr.get("recommendation") or "").strip()
        if isinstance(cats, str):
            cats = [cats]
        cats = [str(x).strip() for x in cats if str(x).strip()]

        # If model didn't fill it, fall back to old recommendation prompt path.
        if risk or cats or rec:
            if lang == "ru":
                formatted = []
                if risk:
                    formatted.append(f"📊 Оценка риска:\n{risk}")
                if cats:
                    formatted.append(f"\n🏷️ Возможные категории:\n{', '.join(cats)}")
                if rec:
                    formatted.append(f"\n💡 Рекомендация:\n{rec}")
                return {"type": "recommendation", "content": "\n".join(formatted).strip(), "hpi_data": hpi_data}
            if lang == "en":
                formatted = []
                if risk:
                    formatted.append(f"📊 Risk Assessment:\n{risk}")
                if cats:
                    formatted.append(f"\n🏷️ Possible Categories:\n{', '.join(cats)}")
                if rec:
                    formatted.append(f"\n💡 Recommendation:\n{rec}")
                return {"type": "recommendation", "content": "\n".join(formatted).strip(), "hpi_data": hpi_data}

            formatted = []
            if risk:
                formatted.append(f"📊 Xavf baholash:\n{risk}")
            if cats:
                formatted.append(f"\n🏷️ Mumkin bo'lgan kategoriyalar:\n{', '.join(cats)}")
            if rec:
                formatted.append(f"\n💡 Tavsiya:\n{rec}")
            return {"type": "recommendation", "content": "\n".join(formatted).strip(), "hpi_data": hpi_data}

    # -----------------------------
    # Fallback (if controller failed)
    # -----------------------------
    # Use previous deterministic logic as a safe fallback to avoid dead-ends.
    try:
        current_slots = hpi_data.get("slots") or {}
        current_slots.update(heuristic_slot_patch(text, language))
        slot_updates = extract_slots(text, language, current_slots)
        if isinstance(slot_updates, dict) and slot_updates:
            hpi_data["slots"] = {**current_slots, **slot_updates}
        else:
            hpi_data["slots"] = current_slots
    except Exception:
        pass

    q = next_question(hpi_data.get("slots") or {}, language)
    if q:
        return {"type": "question", "content": q, "hpi_data": hpi_data}

    # Phase 2: Provide recommendation via older prompt
    lang_prompts = {
        "uz": {
            "recommendation_system": """You are a helpful medical assistant providing practical advice.

CRITICAL: You MUST provide REAL, SPECIFIC, HELPFUL advice based on the patient's symptoms. DO NOT give generic responses like "see a doctor" or "discuss with your doctor" unless it's truly urgent.

Based on the patient's symptoms and responses, you MUST provide:
1. What the problem might be (explain in simple, understandable terms)
2. SPECIFIC practical advice on what can help (be concrete and actionable)
3. When to seek medical care (be specific about timing and urgency)

ABSOLUTE RULES:
- DO NOT diagnose a specific disease name.
- DO NOT say "you have X disease".
- DO NOT give generic advice like "discuss with your doctor" or "see a doctor" unless truly urgent.
- DO explain what might be causing the symptoms in general, understandable terms.
- DO provide SPECIFIC, PRACTICAL advice about what the patient can do RIGHT NOW.
- DO suggest specific self-care measures, home remedies, or over-the-counter options if appropriate.
- DO be helpful and actionable - tell them exactly what to do.

Output must be JSON only, in the following format:

{
  "risk_assessment": "...",
  "possible_categories": ["...", "..."],
  "recommendation": "..."
}

Definitions:
- risk_assessment = Brief explanation of what might be causing the symptoms and how serious it could be. Be specific based on the symptoms provided (1-2 sentences).
- possible_categories = What type of problem this might be based on the symptoms (e.g., "musculoskeletal", "gastrointestinal", "respiratory", "neurological", etc.) - 2-3 specific categories.
- recommendation = MUST include: (1) SPECIFIC things that can help at home/self-care (e.g., "rest the affected area", "apply cold compress", "drink plenty of water", "take over-the-counter pain reliever if needed"), (2) What to watch for (specific warning signs), (3) When to see a doctor (be specific: "if symptoms persist more than X days" or "if you experience Y"). Be VERY SPECIFIC and HELPFUL.

EXAMPLES OF GOOD RECOMMENDATIONS:
- "Dam oling va og'riq bo'lgan joyga sovuq kompress qo'ying. Agar og'riq kuchli bo'lsa, paracetamol yoki ibuprofen qabul qilishingiz mumkin. Agar 2-3 kundan keyin yaxshilanmasa, shifokorga murojaat qiling."
- "Ko'p suv iching va dam oling. Isitma 38.5°C dan yuqori bo'lsa yoki 3 kundan ko'p davom etsa, shifokorga murojaat qiling."

EXAMPLES OF BAD RECOMMENDATIONS (DO NOT USE):
- "Iltimos, bu masalani shifokoringiz bilan muhokama qiling."
- "Tibbiy ko'rikdan o'tkazishni talab qilishi mumkin."
- "Shifokorga murojaat qiling."

IMPORTANT: 
- You MUST analyze the specific symptoms provided and give tailored advice.
- Be SPECIFIC and ACTIONABLE - tell them exactly what to do.
- Only recommend urgent/immediate doctor visit if symptoms are truly serious.
- Respond in Uzbek (O'zbek tilida javob bering).""",
        },
        "ru": {
            "recommendation_system": """You are a helpful medical assistant providing practical advice.

CRITICAL: You MUST provide REAL, SPECIFIC, HELPFUL advice based on the patient's symptoms. DO NOT give generic responses like "see a doctor" or "discuss with your doctor" unless it's truly urgent.

Based on the patient's symptoms and responses, you MUST provide:
1. What the problem might be (explain in simple, understandable terms)
2. SPECIFIC practical advice on what can help (be concrete and actionable)
3. When to seek medical care (be specific about timing and urgency)

ABSOLUTE RULES:
- DO NOT diagnose a specific disease name.
- DO NOT say "you have X disease".
- DO NOT give generic advice like "discuss with your doctor" or "see a doctor" unless truly urgent.
- DO explain what might be causing the symptoms in general, understandable terms.
- DO provide SPECIFIC, PRACTICAL advice about what the patient can do RIGHT NOW.
- DO suggest specific self-care measures, home remedies, or over-the-counter options if appropriate.
- DO be helpful and actionable - tell them exactly what to do.

Output must be JSON only, in the following format:

{
  "risk_assessment": "...",
  "possible_categories": ["...", "..."],
  "recommendation": "..."
}

Definitions:
- risk_assessment = Brief explanation of what might be causing the symptoms and how serious it could be. Be specific based on the symptoms provided (1-2 sentences).
- possible_categories = What type of problem this might be based on the symptoms (e.g., "musculoskeletal", "gastrointestinal", "respiratory", "neurological", etc.) - 2-3 specific categories.
- recommendation = MUST include: (1) SPECIFIC things that can help at home/self-care, (2) What to watch for (specific warning signs), (3) When to see a doctor (be specific about timing). Be VERY SPECIFIC and HELPFUL.

IMPORTANT: 
- You MUST analyze the specific symptoms provided and give tailored advice.
- Be SPECIFIC and ACTIONABLE - tell them exactly what to do.
- Only recommend urgent/immediate doctor visit if symptoms are truly serious.
- Respond in Russian (Отвечайте на русском языке).""",
        },
        "en": {
            "recommendation_system": """You are a helpful medical assistant providing practical advice.

CRITICAL: You MUST provide REAL, SPECIFIC, HELPFUL advice based on the patient's symptoms. DO NOT give generic responses like "see a doctor" or "discuss with your doctor" unless it's truly urgent.

Based on the patient's symptoms and responses, you MUST provide:
1. What the problem might be (explain in simple, understandable terms)
2. SPECIFIC practical advice on what can help (be concrete and actionable)
3. When to seek medical care (be specific about timing and urgency)

ABSOLUTE RULES:
- DO NOT diagnose a specific disease name.
- DO NOT say "you have X disease".
- DO NOT give generic advice like "discuss with your doctor" or "see a doctor" unless truly urgent.
- DO explain what might be causing the symptoms in general, understandable terms.
- DO provide SPECIFIC, PRACTICAL advice about what the patient can do RIGHT NOW.
- DO suggest specific self-care measures, home remedies, or over-the-counter options if appropriate.
- DO be helpful and actionable - tell them exactly what to do.

Output must be JSON only, in the following format:

{
  "risk_assessment": "...",
  "possible_categories": ["...", "..."],
  "recommendation": "..."
}

Definitions:
- risk_assessment = Brief explanation of what might be causing the symptoms and how serious it could be. Be specific based on the symptoms provided (1-2 sentences).
- possible_categories = What type of problem this might be based on the symptoms (e.g., "musculoskeletal", "gastrointestinal", "respiratory", "neurological", etc.) - 2-3 specific categories.
- recommendation = MUST include: (1) SPECIFIC things that can help at home/self-care (e.g., "rest the affected area", "apply cold compress", "drink plenty of water", "take over-the-counter pain reliever if needed"), (2) What to watch for (specific warning signs), (3) When to see a doctor (be specific: "if symptoms persist more than X days" or "if you experience Y"). Be VERY SPECIFIC and HELPFUL.

EXAMPLES OF GOOD RECOMMENDATIONS:
- "Rest and apply a cold compress to the affected area. If pain is severe, you can take acetaminophen or ibuprofen. If symptoms don't improve after 2-3 days, see a doctor."
- "Drink plenty of water and rest. If fever is above 38.5°C or lasts more than 3 days, see a doctor."

EXAMPLES OF BAD RECOMMENDATIONS (DO NOT USE):
- "Please discuss this with your doctor."
- "May require medical evaluation."
- "See a doctor."

IMPORTANT: 
- You MUST analyze the specific symptoms provided and give tailored advice.
- Be SPECIFIC and ACTIONABLE - tell them exactly what to do.
- Only recommend urgent/immediate doctor visit if symptoms are truly serious.""",
        },
    }

    prompts = lang_prompts.get(language, lang_prompts["uz"])
    system_prompt = prompts["recommendation_system"]
    
    # Build complete HPI JSON
    hpi_json = {
        "chief_complaint": hpi_data.get("chief_complaint", ""),
        "responses": hpi_data.get("responses", []),
        "source": "telegram_chat"
    }
    
    user_prompt = f"""Patient HPI data:

{json.dumps(hpi_json, indent=2, ensure_ascii=False)}

Produce the JSON as instructed above."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    try:
        raw = _call_llm(messages, max_tokens=256)
        
        # Parse JSON safely
        try:
            txt = raw.strip()
            if txt.startswith("```"):
                txt = txt.strip("`")
                txt = txt.replace("json\n", "").replace("JSON\n", "", 1).strip()
            
            result = json.loads(txt)
        except Exception:
            # Better fallback - try to give some basic advice based on symptoms
            chief_complaint = hpi_json.get("chief_complaint", "").lower()
            responses_text = " ".join(hpi_json.get("responses", [])).lower()
            all_symptoms = f"{chief_complaint} {responses_text}"
            
            # Try to infer basic category and advice
            if any(word in all_symptoms for word in ["bosh", "head", "голова", "og'riq", "pain", "боль"]):
                risk = "Bosh og'rig'i ko'pincha stress, uyqusizlik yoki dehidratatsiyadan kelib chiqadi." if language == "uz" else "Головная боль часто возникает из-за стресса, недосыпания или обезвоживания." if language == "ru" else "Headache often occurs due to stress, lack of sleep, or dehydration."
                categories = ["neurological", "stress-related"] if language == "en" else ["nevrologik", "stress bilan bog'liq"] if language == "uz" else ["неврологический", "связанный со стрессом"]
                rec = "Dam oling, ko'p suv iching va qorong'u xonada yotib turing. Agar og'riq 2-3 kundan ko'p davom etsa yoki kuchayib borsa, shifokorga murojaat qiling." if language == "uz" else "Отдохните, пейте много воды и полежите в темной комнате. Если боль длится более 2-3 дней или усиливается, обратитесь к врачу." if language == "ru" else "Rest, drink plenty of water, and lie down in a dark room. If pain lasts more than 2-3 days or worsens, see a doctor."
            elif any(word in all_symptoms for word in ["qorin", "stomach", "живот", "qusish", "vomit", "рвота"]):
                risk = "Qorin og'rig'i va ko'ngil aynishi ko'pincha ovqatlanish yoki virusdan kelib chiqadi." if language == "uz" else "Боль в животе и тошнота часто возникают из-за питания или вируса." if language == "ru" else "Stomach pain and nausea often occur due to diet or virus."
                categories = ["gastrointestinal"] if language == "en" else ["gastrointestinal"] if language == "uz" else ["желудочно-кишечный"]
                rec = "Yengil ovqatlang, ko'p suv iching va dam oling. Agar qusish yoki ishal 24 soatdan ko'p davom etsa, shifokorga murojaat qiling." if language == "uz" else "Ешьте легкую пищу, пейте много воды и отдыхайте. Если рвота или диарея длятся более 24 часов, обратитесь к врачу." if language == "ru" else "Eat light food, drink plenty of water, and rest. If vomiting or diarrhea lasts more than 24 hours, see a doctor."
            else:
                risk = "Alomatlar turli sabablarga bog'liq bo'lishi mumkin." if language == "uz" else "Симптомы могут быть связаны с различными причинами." if language == "ru" else "Symptoms may be related to various causes."
                categories = ["general"] if language == "en" else ["umumiy"] if language == "uz" else ["общий"]
                rec = "Dam oling va alomatlarni kuzatib boring. Agar ular 2-3 kundan ko'p davom etsa yoki yomonlashsa, shifokorga murojaat qiling." if language == "uz" else "Отдыхайте и следите за симптомами. Если они длятся более 2-3 дней или ухудшаются, обратитесь к врачу." if language == "ru" else "Rest and monitor symptoms. If they last more than 2-3 days or worsen, see a doctor."
            
            result = {
                "risk_assessment": risk,
                "possible_categories": categories,
                "recommendation": rec
            }
        
        # Format response based on language
        if language == "uz":
            response_parts = []
            if result.get("risk_assessment"):
                response_parts.append(f"📊 Xavf baholash:\n{result['risk_assessment']}")
            if result.get("possible_categories"):
                categories = ", ".join(result["possible_categories"])
                response_parts.append(f"\n🏷️ Mumkin bo'lgan kategoriyalar:\n{categories}")
            if result.get("recommendation"):
                response_parts.append(f"\n💡 Tavsiya:\n{result['recommendation']}")
            formatted = "\n".join(response_parts) if response_parts else raw
        elif language == "ru":
            response_parts = []
            if result.get("risk_assessment"):
                response_parts.append(f"📊 Оценка риска:\n{result['risk_assessment']}")
            if result.get("possible_categories"):
                categories = ", ".join(result["possible_categories"])
                response_parts.append(f"\n🏷️ Возможные категории:\n{categories}")
            if result.get("recommendation"):
                response_parts.append(f"\n💡 Рекомендация:\n{result['recommendation']}")
            formatted = "\n".join(response_parts) if response_parts else raw
        else:  # English
            response_parts = []
            if result.get("risk_assessment"):
                response_parts.append(f"📊 Risk Assessment:\n{result['risk_assessment']}")
            if result.get("possible_categories"):
                categories = ", ".join(result["possible_categories"])
                response_parts.append(f"\n🏷️ Possible Categories:\n{categories}")
            if result.get("recommendation"):
                response_parts.append(f"\n💡 Recommendation:\n{result['recommendation']}")
            formatted = "\n".join(response_parts) if response_parts else raw
        
        return {
            "type": "recommendation",
            "content": formatted,
            "hpi_data": hpi_data,
        }
        
    except Exception as e:
        error_msg = str(e)
        # If it's a ValueError from _call_llm, it contains detailed error info
        if "All endpoint formats failed" in error_msg:
            # Show the detailed error to help debug
            detailed_error = error_msg
        else:
            detailed_error = f"{error_msg}"
        
        return {
            "type": "error",
            "content": f"Tabib xatosi: {detailed_error}" if language == "uz" else f"Ошибка врача: {detailed_error}" if language == "ru" else f"Doctor error: {detailed_error}",
            "hpi_data": hpi_data,
        }


# ---------------------------
# Backend patient API helpers
# ---------------------------
def _api_base() -> str:
    base = os.getenv("TELEGRAM_API_BASE") or os.getenv("SERVICE_URL") or "http://127.0.0.1:8000"
    if base.endswith("/"):
        base = base[:-1]
    return base + "/api/v1/telegram"


def link_patient_api(phone: str) -> Dict[str, Any]:
    url = urljoin(_api_base() + "/", "link")
    headers = {"X-Telegram-Bot-Token": BOT_TOKEN}
    resp = requests.post(url, json={"phone": phone}, headers=headers, timeout=30)
    if resp.status_code == 200:
        return resp.json()
    if resp.status_code == 404:
        raise ValueError("not_found")
    raise ValueError(f"link_failed:{resp.status_code}")


def fetch_appointments_api(patient_id: str) -> list[Dict[str, Any]]:
    url = urljoin(_api_base() + "/", f"patient/{patient_id}/appointments?scope=upcoming")
    headers = {"X-Telegram-Bot-Token": BOT_TOKEN}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_reports_api(patient_id: str) -> list[Dict[str, Any]]:
    url = urljoin(_api_base() + "/", f"patient/{patient_id}/reports?limit=5")
    headers = {"X-Telegram-Bot-Token": BOT_TOKEN}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def fetch_departments_api() -> list[Dict[str, Any]]:
    url = urljoin(_api_base() + "/", "departments?limit=500")
    headers = {"X-Telegram-Bot-Token": BOT_TOKEN}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def departments_kb(data: Dict[str, Any], depts: list[Dict[str, Any]]) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    # 2 per row for compactness
    current: list[InlineKeyboardButton] = []
    for d in depts:
        dept_id = str(d.get("id") or "")
        name = str(d.get("name") or "Department")
        hosp = str(d.get("hospital_name") or "").strip()
        label = f"{name}" + (f" — {hosp}" if hosp else "")
        btn = InlineKeyboardButton(text=label[:64], callback_data=f"appt_dept_{dept_id}")
        current.append(btn)
        if len(current) == 2:
            rows.append(current)
            current = []
    if current:
        rows.append(current)
    rows.append([InlineKeyboardButton(text=t(data, "btn_back"), callback_data="menu_back")])
    return InlineKeyboardMarkup(rows)


# ---------------------------
# Handlers
# ---------------------------
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data.setdefault("lang", "uz")
    context.user_data["mode"] = MODE_NONE
    await update.effective_message.reply_text(
        TEXT["choose_language"][user_lang(context.user_data)], reply_markup=lang_kb()
    )

async def cmd_lang(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        TEXT["choose_language"][user_lang(context.user_data)], reply_markup=lang_kb()
    )

async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(t(context.user_data, "help"))

async def cmd_end(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data["mode"] = MODE_NONE
    await update.effective_message.reply_text(
        t(context.user_data, "how_help"), reply_markup=main_menu_kb(context.user_data)
    )

async def on_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    data = query.data
    if data.startswith("lang_"):
        lang = data.split("_")[1]
        context.user_data["lang"] = lang
        context.user_data["mode"] = MODE_NONE
        name = (update.effective_user.first_name or "")[:32]
        welcome = TEXT["welcome"][lang].format(name=name)
        how = TEXT["how_help"][lang]
        await query.edit_message_text(
            f"{welcome}\n{how}",
            reply_markup=main_menu_kb(context.user_data),
        )
        return

    if data == "menu_analyze":
        context.user_data["mode"] = MODE_ANALYZE
        await query.edit_message_text(
            t(context.user_data, "ask_send_image"), reply_markup=back_kb(context.user_data)
        )
        return

    if data == "menu_chat":
        context.user_data["mode"] = MODE_CHAT
        # AI-controller state (slots + short transcript)
        context.user_data["pv_state"] = {
            "slots": {},
            "transcript": [],
            "asked_questions": [],
            "question_count": 0,
            "max_questions": 6,
        }
        # Ensure any previous reply keyboard (e.g., contact share) is cleared,
        # then show the chat "Finish" reply keyboard for persistent access.
        try:
            await query.message.reply_text("✅", reply_markup=ReplyKeyboardRemove())
        except Exception:
            pass
        await query.edit_message_text(t(context.user_data, "enter_message"), reply_markup=chat_kb(context.user_data))
        await query.message.reply_text(t(context.user_data, "enter_message"), reply_markup=chat_reply_kb(context.user_data))
        return

    if data == "menu_link":
        context.user_data["mode"] = MODE_LINK
        await query.message.reply_text(
            t(context.user_data, "ask_phone"),
            reply_markup=contact_kb(context.user_data),
        )
        await query.answer()
        return

    if data == "menu_make_appt":
        await query.edit_message_text(t(context.user_data, "fetching"))
        try:
            depts = fetch_departments_api()
        except Exception as e:
            await query.edit_message_text(f"Error: {e}", reply_markup=back_kb(context.user_data))
            return

        if not depts:
            await query.edit_message_text(
                t(context.user_data, "make_appt_no_url"),
                reply_markup=back_kb(context.user_data),
            )
            return

        # Cache for later selection lookup
        context.user_data["appt_departments"] = depts
        await query.edit_message_text(
            t(context.user_data, "choose_department"),
            reply_markup=departments_kb(context.user_data, depts),
        )
        return

    if data.startswith("appt_dept_"):
        dept_id = data.replace("appt_dept_", "", 1)
        depts = context.user_data.get("appt_departments") or []
        picked = None
        for d in depts:
            if str(d.get("id")) == dept_id:
                picked = d
                break

        # Configurable booking URL (preferred) -> fallback to SERVICE_URL -> otherwise show reception message
        booking_url = (
            os.getenv("TELEGRAM_APPOINTMENT_URL")
            or os.getenv("APPOINTMENT_URL")
            or (SERVICE_URL or "").rstrip("/")
        )

        if booking_url:
            # If your booking page supports it, you can later add a query param like ?department_id=...
            title = str(picked.get("name") if picked else "Department")
            hosp = str(picked.get("hospital_name") if picked else "").strip()
            header = f"🗓️ {title}" + (f" — {hosp}" if hosp else "")
            await query.edit_message_text(
                header + "\n\n" + t(context.user_data, "make_appt").format(url=booking_url),
                reply_markup=back_kb(context.user_data),
            )
        else:
            await query.edit_message_text(
                t(context.user_data, "make_appt_no_url"),
                reply_markup=back_kb(context.user_data),
            )
        return

    if data == "menu_appts":
        patient_id = context.user_data.get("patient_id")
        if not patient_id:
            await query.edit_message_text(
                t(context.user_data, "need_link_first"), reply_markup=main_menu_kb(context.user_data)
            )
            return
        await query.edit_message_text(t(context.user_data, "fetching"))
        try:
            appts = fetch_appointments_api(patient_id)
            if not appts:
                await query.edit_message_text(
                    t(context.user_data, "no_appts"), reply_markup=main_menu_kb(context.user_data)
                )
                return
            lines = []
            for a in appts:
                lines.append(f"{a.get('date','')} {a.get('time','')} — {a.get('hospital','')}")
                doctor = a.get("doctor")
                if doctor:
                    lines.append(f"👨‍⚕️ {doctor}")
                status = a.get("status")
                if status:
                    lines.append(f"📌 {status}")
                notes = a.get("notes")
                if notes:
                    lines.append(notes)
                lines.append("")  # spacer
            await query.edit_message_text(
                "\n".join(lines).strip() or t(context.user_data, "no_appts"),
                reply_markup=main_menu_kb(context.user_data),
            )
        except Exception as e:
            await query.edit_message_text(f"Error: {e}", reply_markup=main_menu_kb(context.user_data))
        return

    if data == "menu_reports":
        patient_id = context.user_data.get("patient_id")
        if not patient_id:
            await query.edit_message_text(
                t(context.user_data, "need_link_first"), reply_markup=main_menu_kb(context.user_data)
            )
            return
        await query.edit_message_text(t(context.user_data, "fetching"))
        try:
            reps = fetch_reports_api(patient_id)
            if not reps:
                await query.edit_message_text(
                    t(context.user_data, "no_reports"), reply_markup=main_menu_kb(context.user_data)
                )
                return
            lines = []
            for r in reps:
                lines.append(f"📝 {r.get('chief_complaint','') or ''}")
                status = r.get("status")
                if status:
                    lines.append(f"📌 {status}")
                dt = r.get("created_at")
                if dt:
                    lines.append(str(dt))
                lines.append("")
            await query.edit_message_text(
                "\n".join(lines).strip() or t(context.user_data, "no_reports"),
                reply_markup=main_menu_kb(context.user_data),
            )
        except Exception as e:
            await query.edit_message_text(f"Error: {e}", reply_markup=main_menu_kb(context.user_data))
        return

    if data == "chat_finish":
        # Explicit finish: exit chat mode and return to main menu (like recommendation flow).
        context.user_data["mode"] = MODE_NONE
        context.user_data["pv_state"] = {
            "slots": {},
            "transcript": [],
            "asked_questions": [],
            "question_count": 0,
            "max_questions": 6,
        }
        await query.edit_message_text(
            t(context.user_data, "how_help"),
            reply_markup=main_menu_kb(context.user_data),
        )
        return

    if data == "menu_back":
        # If user is leaving link flow, remove the persistent contact reply keyboard too.
        if context.user_data.get("mode") == MODE_LINK:
            context.user_data["mode"] = MODE_NONE
            try:
                await query.message.reply_text("✅", reply_markup=ReplyKeyboardRemove())
            except Exception:
                pass
        else:
            context.user_data["mode"] = MODE_NONE
        await query.edit_message_text(
            t(context.user_data, "how_help"), reply_markup=main_menu_kb(context.user_data)
        )
        return

async def on_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.user_data.get("mode") != MODE_ANALYZE:
        return  # ignore

    await send_typing(update, context)

    photo = update.message.photo[-1]
    file = await photo.get_file()
    downloads = Path("downloads"); downloads.mkdir(exist_ok=True)
    local_path = downloads / f"photo_{update.effective_user.id}_{photo.file_unique_id}.jpg"
    await file.download_to_drive(local_path)

    await update.effective_message.reply_text(t(context.user_data, "processing_image"))

    try:
        # NOTE: analyze_image must be defined elsewhere in your project
        result = analyze_image(local_path, user_lang(context.user_data))
        summary = result.get("summary", "No result")
        await update.effective_message.reply_text(
            t(context.user_data, "image_result").format(summary=summary),
            reply_markup=back_kb(context.user_data),
        )
    except Exception as e:
        await update.effective_message.reply_text(f"Error: {e}", reply_markup=back_kb(context.user_data))

async def on_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.user_data.get("mode") != MODE_ANALYZE:
        return

    doc = update.message.document
    filename = (doc.file_name or "").lower()
    if not (filename.endswith(".dcm") or doc.mime_type in {"application/dicom", "application/dicom+json"}):
        return

    await send_typing(update, context)

    downloads = Path("downloads"); downloads.mkdir(exist_ok=True)
    local_path = downloads / f"dicom_{update.effective_user.id}_{doc.file_unique_id}.dcm"
    file = await doc.get_file()
    await file.download_to_drive(local_path)

    await update.effective_message.reply_text(t(context.user_data, "processing_image"))

    try:
        # NOTE: analyze_image must be defined elsewhere in your project
        result = analyze_image(local_path, user_lang(context.user_data))
        summary = result.get("summary", "No result")
        await update.effective_message.reply_text(
            t(context.user_data, "image_result").format(summary=summary),
            reply_markup=back_kb(context.user_data),
        )
    except Exception as e:
        await update.effective_message.reply_text(f"Error: {e}", reply_markup=back_kb(context.user_data))

async def on_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.user_data.get("mode") != MODE_LINK:
        return

    contact = update.effective_message.contact
    phone = contact.phone_number if contact else None
    if not phone:
        await update.effective_message.reply_text(
            t(context.user_data, "ask_phone"), reply_markup=contact_kb(context.user_data)
        )
        return

    try:
        result = link_patient_api(phone)
        context.user_data["patient_id"] = result.get("patient_id")
        context.user_data["patient_name"] = result.get("full_name")
        context.user_data["access_token"] = result.get("access_token")
        # Remove the contact share reply keyboard so it doesn't stay visible forever.
        await update.effective_message.reply_text("✅", reply_markup=ReplyKeyboardRemove())
        context.user_data["mode"] = MODE_NONE
        await update.effective_message.reply_text(
            t(context.user_data, "link_success").format(name=result.get("full_name", "")),
            reply_markup=main_menu_kb(context.user_data),
        )
    except ValueError as ve:
        if str(ve) == "not_found":
            await update.effective_message.reply_text(
                t(context.user_data, "link_failed"), reply_markup=back_kb(context.user_data)
            )
        else:
            await update.effective_message.reply_text(
                f"Error: {ve}", reply_markup=back_kb(context.user_data)
            )
    except Exception as e:
        await update.effective_message.reply_text(
            f"Error: {e}", reply_markup=back_kb(context.user_data)
        )

async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Idempotency guard: avoid double-processing the same Telegram message
    msg_id = getattr(update.effective_message, "message_id", None)
    if msg_id is not None:
        last_id = context.user_data.get("last_msg_id")
        if last_id == msg_id:
            return
        context.user_data["last_msg_id"] = msg_id

    # Link mode: require contact share
    if context.user_data.get("mode") == MODE_LINK:
        # If user typed anything (instead of sharing contact), keep prompting for contact,
        # but do not let the reply keyboard "leak" into other modes.
        await update.effective_message.reply_text(
            t(context.user_data, "ask_phone"), reply_markup=contact_kb(context.user_data)
        )
        return

    if context.user_data.get("mode") != MODE_CHAT:
        return

    await send_typing(update, context)
    user_text = update.effective_message.text or ""
    language = user_lang(context.user_data)

    # Finish chat via reply-keyboard button (or any localized text match)
    if user_text.strip() == t(context.user_data, "btn_finish_chat"):
        context.user_data["mode"] = MODE_NONE
        context.user_data["pv_state"] = {
            "slots": {},
            "transcript": [],
            "asked_questions": [],
            "question_count": 0,
            "max_questions": 6,
        }
        # Remove chat reply keyboard and open main menu (inline)
        await update.effective_message.reply_text("✅", reply_markup=ReplyKeyboardRemove())
        await update.effective_message.reply_text(
            t(context.user_data, "how_help"),
            reply_markup=main_menu_kb(context.user_data),
        )
        return

    try:
        state = context.user_data.get("pv_state") or {
            "slots": {},
            "transcript": [],
            "asked_questions": [],
            "question_count": 0,
            "max_questions": 6,
        }
        # 3-mode router
        route = route_mode(user_text, language, state)
        mode = route.get("mode", "intake")

        if mode == "qa":
            answer = (route.get("answer_now") or "").strip()
            q = (route.get("next_question") or "").strip()
            if answer:
                await update.effective_message.reply_text(answer)
                return
            if q:
                await update.effective_message.reply_text(q)
                return
            # fallback to intake if router didn't provide anything
            mode = "intake"

        if mode == "recommendation":
            # Extract/update slots from latest message first
            try:
                extractor_updates = extract_slots_from_message(user_text, state.get("slots", {}))
                if isinstance(extractor_updates, dict) and extractor_updates:
                    state["slots"] = {**(state.get("slots") or {}), **{k: v for k, v in extractor_updates.items() if v is not None}}
            except Exception:
                pass

            # Generate recommendation now (Uzbek actionable schema)
            if language == "uz":
                fr = generate_actionable_recommendation_uz(
                    {"latest_user_message": user_text, "slots": state.get("slots", {}), "transcript": state.get("transcript", [])[-10:]}
                )
                result = {"type": "recommendation", "content": fr, "state": state}
            else:
                # Non-UZ: fall back to controller to produce its final_recommendation
                result = ai_controller_step(user_text, state, language)

            context.user_data["pv_state"] = result.get("state", state)
        else:
            # intake mode: extractor -> controller questioning loop
            result = ai_controller_step(user_text, state, language)
            context.user_data["pv_state"] = result.get("state", state)

        if result["type"] == "question":
            await update.effective_message.reply_text(result["content"])
            return

        if result["type"] == "recommendation":
            fr = result["content"]  # dict
            if not isinstance(fr, dict):
                await update.effective_message.reply_text("Tabib xatosi: invalid recommendation format")
                return

            if language == "uz":
                # Support both old schema and new actionable schema
                cats = fr.get("possible_categories", [])
                cats_str = ", ".join(cats) if isinstance(cats, list) else str(cats)

                self_care = fr.get("self_care_now", [])
                if isinstance(self_care, list) and self_care:
                    self_care_txt = "\n".join([f"- {x}" for x in self_care if str(x).strip()])
                else:
                    self_care_txt = ""

                scw = fr.get("seek_care_when", {}) if isinstance(fr.get("seek_care_when"), dict) else {}
                def _bul(title: str, items: Any) -> str:
                    if not isinstance(items, list) or not items:
                        return ""
                    return title + "\n" + "\n".join([f"- {x}" for x in items if str(x).strip()])

                seek_txt_parts = [
                    _bul("🚑 Shoshilinch (hozir):", scw.get("emergency_now")),
                    _bul("🏥 Bugun (same-day):", scw.get("same_day")),
                    _bul("📅 Rejali:", scw.get("routine")),
                ]
                seek_txt = "\n\n".join([p for p in seek_txt_parts if p])

                base = (
                    f"📊 Xavf baholash:\n{fr.get('risk_assessment','')}\n\n"
                    f"🏷️ Mumkin bo‘lgan kategoriyalar:\n{cats_str}\n"
                )
                if self_care_txt:
                    base += f"\n\n🧾 Hozir nima qilish kerak:\n{self_care_txt}"
                if seek_txt:
                    base += f"\n\n⏱️ Qachon shifokorga murojaat qilish:\n{seek_txt}"
                if fr.get("recommendation"):
                    base += f"\n\n💡 Tavsiya:\n{fr.get('recommendation','')}"
                out = base + f"\n\n{t(context.user_data,'chat_disclaimer')}"
            elif language == "ru":
                out = (
                    f"📊 Оценка риска:\n{fr.get('risk_assessment','')}\n\n"
                    f"🏷️ Категории:\n{', '.join(fr.get('possible_categories',[]))}\n\n"
                    f"💡 Рекомендация:\n{fr.get('recommendation','')}\n\n"
                    f"{t(context.user_data,'chat_disclaimer')}"
                )
            else:
                out = (
                    f"📊 Risk Assessment:\n{fr.get('risk_assessment','')}\n\n"
                    f"🏷️ Categories:\n{', '.join(fr.get('possible_categories',[]))}\n\n"
                    f"💡 Recommendation:\n{fr.get('recommendation','')}\n\n"
                    f"{t(context.user_data,'chat_disclaimer')}"
                )

            context.user_data["mode"] = MODE_NONE
            context.user_data["pv_state"] = {
                "slots": {},
                "transcript": [],
                "asked_questions": [],
                "question_count": 0,
                "max_questions": 6,
            }
            await update.effective_message.reply_text(out, reply_markup=main_menu_kb(context.user_data))
            return

        await update.effective_message.reply_text(result.get("content", "Tabib xatosi"))
            
    except Exception as e:
        out = f"Xatolik: {e}"
    await update.effective_message.reply_text(out)

async def on_fallback_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.user_data.get("mode") == MODE_ANALYZE:
        await update.effective_message.reply_text(t(context.user_data, "ask_send_image"))

async def on_error(update: Optional[Update], context: ContextTypes.DEFAULT_TYPE) -> None:
    logging.exception("Update caused error", exc_info=context.error)

# ---------------------------
# App bootstrap
# ---------------------------
async def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
    )

    data_dir = Path(".data"); data_dir.mkdir(exist_ok=True)
    persistence = PicklePersistence(filepath=str(data_dir / "fiattib_bot.pickle"))

    # NEW: Harden Telegram HTTP client (timeouts + optional proxy)
    req = HTTPXRequest(
        read_timeout=90,
        connect_timeout=45,
        write_timeout=90,
        pool_timeout=30,
        proxy_url=None,        # force NO proxy (ignores env proxies)
        http_version="1.1",
    )

    app: Application = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .request(req)               # << use robust HTTP client
        .persistence(persistence)
        .build()
    )

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("lang", cmd_lang))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("end", cmd_end))

    app.add_handler(CallbackQueryHandler(on_cb))

    # Content handlers
    app.add_handler(MessageHandler(filters.PHOTO, on_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, on_document))
    app.add_handler(MessageHandler(filters.CONTACT, on_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.add_handler(MessageHandler(filters.ALL, on_fallback_file))

    app.add_error_handler(on_error)

    logging.info("🚀 FIATTIB bot starting…")
    await app.initialize()
    await app.start()
    try:
        await app.updater.start_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,
        )
        await asyncio.Event().wait()  # run forever
    finally:
        await app.updater.stop()
        await app.stop()
        await app.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Bot stopped")

from __future__ import annotations

import os
import re
import threading
from functools import lru_cache
from typing import Literal

import torch
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoModelForSeq2SeqLM, AutoTokenizer

try:
    from peft import PeftModel
except ImportError:  # pragma: no cover
    PeftModel = None


TranslateModelId = Literal["translategemma", "nllb200"]


class ModelInfo(BaseModel):
    id: TranslateModelId
    label: str
    repository: str
    family: str


class LanguageOption(BaseModel):
    code: str
    label: str


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    model: TranslateModelId
    source_lang: str = "uz-Arab"
    target_lang: str = "ru"
    max_new_tokens: int = Field(default=512, ge=16, le=2048)


class TranslateResponse(BaseModel):
    text: str
    model: TranslateModelId
    source_lang: str
    target_lang: str


class MetaResponse(BaseModel):
    models: list[ModelInfo]
    languages: list[LanguageOption]
    defaults: dict[str, str]


class HealthResponse(BaseModel):
    status: str


TRANSLATEGEMMA_REPO = os.getenv(
    "TRANSLATEGEMMA_MODEL_ID",
    "BekaBratan/translategemma-chagatai-dlora_v5",
)
TRANSLATEGEMMA_BASE_REPO = os.getenv(
    "TRANSLATEGEMMA_BASE_MODEL_ID",
    "google/translategemma-4b-it",
)
NLLB_REPO = os.getenv("NLLB_MODEL_ID", "BekaBratan/nllb200-SmartInit-v5")
DEFAULT_SOURCE_LANG = os.getenv("TRANSLATE_SOURCE_LANG", "uz-Arab")
DEFAULT_TARGET_LANG = os.getenv("TRANSLATE_TARGET_LANG", "ru")
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

MODELS = [
    ModelInfo(
        id="translategemma",
        label="TranslateGemma Chagatai dLoRA v5",
        repository=TRANSLATEGEMMA_REPO,
        family="Gemma LoRA",
    ),
    ModelInfo(
        id="nllb200",
        label="NLLB200 SmartInit v5",
        repository=NLLB_REPO,
        family="M2M100/NLLB",
    ),
]

LANGUAGES = [
    LanguageOption(code="uz-Arab", label="Chagatai / Uzbek Arabic"),
    LanguageOption(code="ru", label="Russian"),
    LanguageOption(code="en", label="English"),
    LanguageOption(code="tr", label="Turkish"),
    LanguageOption(code="kk", label="Kazakh"),
    LanguageOption(code="uz", label="Uzbek"),
]

NLLB_LANGUAGE_CODES = {
    "uz-Arab": "chg_Arab",
    "chg_Arab": "chg_Arab",
    "ru": "rus_Cyrl",
    "rus_Cyrl": "rus_Cyrl",
    "en": "eng_Latn",
    "eng_Latn": "eng_Latn",
    "tr": "tur_Latn",
    "tur_Latn": "tur_Latn",
    "kk": "kaz_Cyrl",
    "kaz_Cyrl": "kaz_Cyrl",
    "uz": "uzn_Latn",
    "uzn_Latn": "uzn_Latn",
}

app = FastAPI(title="Chagatai Translate API", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_lock = threading.Lock()


def model_kwargs() -> dict[str, object]:
    kwargs: dict[str, object] = {
        "device_map": None,
        "torch_dtype": torch.float32,
        "low_cpu_mem_usage": True,
    }
    if HF_TOKEN:
        kwargs["token"] = HF_TOKEN
    return kwargs


@lru_cache(maxsize=1)
def load_translategemma():
    if PeftModel is None:
        model = AutoModelForCausalLM.from_pretrained(
            TRANSLATEGEMMA_REPO,
            **model_kwargs(),
        )
    else:
        base_model = AutoModelForCausalLM.from_pretrained(
            TRANSLATEGEMMA_BASE_REPO,
            **model_kwargs(),
        )
        model = PeftModel.from_pretrained(
            base_model,
            TRANSLATEGEMMA_REPO,
            token=HF_TOKEN,
        )

    tokenizer = AutoTokenizer.from_pretrained(
        TRANSLATEGEMMA_REPO,
        token=HF_TOKEN,
    )
    if tokenizer.pad_token_id is None and tokenizer.eos_token_id is not None:
        tokenizer.pad_token = tokenizer.eos_token
    model.to("cpu")
    model.eval()
    return tokenizer, model


@lru_cache(maxsize=1)
def load_nllb():
    tokenizer = AutoTokenizer.from_pretrained(
        NLLB_REPO,
        token=HF_TOKEN,
        extra_special_tokens={},
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_REPO, **model_kwargs())
    model.to("cpu")
    model.eval()
    return tokenizer, model


def build_translategemma_messages(text: str, source_lang: str, target_lang: str):
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "source_lang_code": source_lang,
                    "target_lang_code": target_lang,
                    "text": text,
                }
            ],
        }
    ]


def clean_generated_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"^(translation|перевод)\s*:\s*", "", text.strip(), flags=re.I)
    return text.strip()


def translate_with_translategemma(request: TranslateRequest) -> str:
    tokenizer, model = load_translategemma()
    messages = build_translategemma_messages(
        request.text,
        request.source_lang,
        request.target_lang,
    )

    try:
        prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    except Exception:
        prompt = (
            f"Translate from {request.source_lang} to {request.target_lang}. "
            "Return only the translation.\n\n"
            f"{request.text}\n"
        )

    inputs = tokenizer(prompt, return_tensors="pt").to("cpu")
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
    return clean_generated_text(
        tokenizer.decode(generated_tokens, skip_special_tokens=True)
    )


def get_forced_bos_token_id(tokenizer, target_lang: str) -> int | None:
    target_lang = NLLB_LANGUAGE_CODES.get(target_lang, target_lang)
    lang_code_to_id = getattr(tokenizer, "lang_code_to_id", None)
    if isinstance(lang_code_to_id, dict):
        candidates = [
            target_lang,
            target_lang.replace("-", "_"),
            target_lang.split("-")[0],
        ]
        for candidate in candidates:
            token_id = lang_code_to_id.get(candidate)
            if token_id is not None:
                return int(token_id)

    try:
        token_id = tokenizer.convert_tokens_to_ids(target_lang)
        if token_id != tokenizer.unk_token_id:
            return int(token_id)
    except Exception:
        return None

    return None


def translate_with_nllb(request: TranslateRequest) -> str:
    tokenizer, model = load_nllb()
    source_lang = NLLB_LANGUAGE_CODES.get(request.source_lang, request.source_lang)
    target_lang = NLLB_LANGUAGE_CODES.get(request.target_lang, request.target_lang)

    if hasattr(tokenizer, "src_lang"):
        tokenizer.src_lang = source_lang

    inputs = tokenizer(
        request.text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to("cpu")
    generation_kwargs: dict[str, object] = {
        "max_new_tokens": request.max_new_tokens,
        "do_sample": False,
    }
    forced_bos_token_id = get_forced_bos_token_id(tokenizer, target_lang)
    if forced_bos_token_id is not None:
        generation_kwargs["forced_bos_token_id"] = forced_bos_token_id

    with torch.inference_mode():
        outputs = model.generate(**inputs, **generation_kwargs)

    return clean_generated_text(
        tokenizer.decode(outputs[0], skip_special_tokens=True)
    )


def translate_sync(request: TranslateRequest) -> str:
    with model_lock:
        try:
            if request.model == "translategemma":
                return translate_with_translategemma(request)
            return translate_with_nllb(request)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Could not run {request.model}: {type(exc).__name__}: {exc}"
                ),
            ) from exc


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/meta", response_model=MetaResponse)
def meta() -> MetaResponse:
    return MetaResponse(
        models=MODELS,
        languages=LANGUAGES,
        defaults={
            "model": "translategemma",
            "source_lang": DEFAULT_SOURCE_LANG,
            "target_lang": DEFAULT_TARGET_LANG,
        },
    )


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest) -> TranslateResponse:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    normalized_request = request.model_copy(
        update={
            "text": text,
            "source_lang": request.source_lang or DEFAULT_SOURCE_LANG,
            "target_lang": request.target_lang or DEFAULT_TARGET_LANG,
        }
    )
    translated_text = await run_in_threadpool(translate_sync, normalized_request)
    return TranslateResponse(
        text=translated_text,
        model=normalized_request.model,
        source_lang=normalized_request.source_lang,
        target_lang=normalized_request.target_lang,
    )

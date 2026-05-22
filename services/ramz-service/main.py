from __future__ import annotations

import os
import sys
from dataclasses import fields
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from chagatai_normalizer import NormalizationOptions, normalize_lines


class OptionsPayload(BaseModel):
    remove_tatweel: bool = False
    normalize_kaf_yay: bool = True
    remove_diacritics: bool = False
    collapse_whitespace: bool = True
    normalize_persian_digits: bool = True
    add_zwnj: bool = True
    strip_zero_width: bool = True
    nfkc: bool = True


class NormalizeRequest(BaseModel):
    text: str
    options: OptionsPayload = Field(default_factory=OptionsPayload)


class ChangePayload(BaseModel):
    type: str
    src_start: int
    src_end: int
    src_text: str
    dst_start: int
    dst_end: int
    dst_text: str
    reason: str


class NormalizeResponse(BaseModel):
    text: str
    changes: list[ChangePayload]


class OptionMeta(BaseModel):
    key: str
    label: str
    description: str
    default: bool


class HealthResponse(BaseModel):
    status: str


app = FastAPI(title="Chagatai RAMZ Normalizer API", version="1.0.0")

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


OPTION_META = [
    OptionMeta(
        key="remove_tatweel",
        label="Удалять татвил",
        description="Удаляет символ elongation U+0640.",
        default=False,
    ),
    OptionMeta(
        key="normalize_kaf_yay",
        label="Нормализовать kaf / yay",
        description="Приводит варианты ک, ی, ى, ە и похожие формы к каноническим.",
        default=True,
    ),
    OptionMeta(
        key="remove_diacritics",
        label="Удалять диакритику",
        description="Удаляет харакаты и другие арабские вокализационные знаки.",
        default=False,
    ),
    OptionMeta(
        key="collapse_whitespace",
        label="Сжимать пробелы",
        description="Сжимает пробелы и табы внутри строк, сохраняя переносы.",
        default=True,
    ),
    OptionMeta(
        key="normalize_persian_digits",
        label="Нормализовать цифры",
        description="Переводит персидские цифры ۰-۹ в восточно-арабские ٠-٩.",
        default=True,
    ),
    OptionMeta(
        key="add_zwnj",
        label="Добавлять ZWNJ",
        description="Вставляет Zero-Width Non-Joiner, когда это предотвращает слипание форм.",
        default=True,
    ),
    OptionMeta(
        key="strip_zero_width",
        label="Удалять невидимые символы",
        description="Удаляет ZWJ, LRM, RLM, ALM и BOM, сохраняя ZWNJ.",
        default=True,
    ),
    OptionMeta(
        key="nfkc",
        label="Unicode NFKC",
        description="Применяет совместимую Unicode-нормализацию перед правилами.",
        default=True,
    ),
]


def to_options(payload: OptionsPayload) -> NormalizationOptions:
    valid_keys = {field.name for field in fields(NormalizationOptions)}
    values = payload.model_dump()
    return NormalizationOptions(**{key: values[key] for key in valid_keys})


def normalize_text(text: str, options: OptionsPayload) -> NormalizeResponse:
    result = normalize_lines(text, to_options(options))
    return NormalizeResponse(
        text=result.text,
        changes=[ChangePayload(**change.to_dict()) for change in result.changes],
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/options", response_model=list[OptionMeta])
def options() -> list[OptionMeta]:
    return OPTION_META


@app.post("/api/normalize", response_model=NormalizeResponse)
def normalize_endpoint(payload: NormalizeRequest) -> NormalizeResponse:
    return normalize_text(payload.text, payload.options)


@app.post("/api/normalize-file", response_model=NormalizeResponse)
async def normalize_file_endpoint(
    file: Annotated[UploadFile, File()],
    options_json: Annotated[str, Form()] = "{}",
) -> NormalizeResponse:
    if file.content_type and file.content_type not in {"text/plain", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Поддерживаются только .txt файлы")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Файл должен быть в UTF-8") from exc

    options = OptionsPayload.model_validate_json(options_json)
    return normalize_text(text, options)

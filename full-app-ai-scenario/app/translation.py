"""Servicio de traducción offline inglés → español.

Usa `Helsinki-NLP/opus-mt-en-es` (MarianMT) a través de `transformers`, el mismo
stack que ya usa el clasificador de categorías. El modelo se descarga una sola vez
y luego corre 100% offline desde la caché local del proyecto (`models/hf-cache`).

El clasificador sigue trabajando con el texto original en inglés: este módulo es
independiente y nunca modifica la pregunta que se usa para clasificar.
"""

from __future__ import annotations

import os
import threading
from functools import lru_cache
from pathlib import Path

# La caché de Hugging Face vive dentro del proyecto para que el modelo quede local.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(_PROJECT_ROOT / "models" / "hf-cache"))
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

MODEL_NAME = "Helsinki-NLP/opus-mt-en-es"
# Identifica el modelo con el que se generó cada traducción guardada.
MODEL_VERSION = "Helsinki-NLP/opus-mt-en-es"
SUPPORTED_LANGUAGES = ("en", "es")

_MAX_INPUT_TOKENS = 512
_MAX_NEW_TOKENS = 512

# `model.generate` is not safe to run concurrently on the same model instance:
# two simultaneous decodes can corrupt each other's output. The API triggers
# translations from background tasks, so serialize every generation.
_GENERATION_LOCK = threading.Lock()


@lru_cache(maxsize=1)
def _load_model():
    """Carga (una sola vez) el tokenizador y el modelo de traducción."""
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    model.eval()
    return tokenizer, model


def translate_texts(texts: list[str]) -> list[str]:
    """Traduce un lote de textos en inglés al español (offline)."""
    if not texts:
        return []

    import torch

    with _GENERATION_LOCK:
        tokenizer, model = _load_model()
        inputs = tokenizer(
            texts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=_MAX_INPUT_TOKENS,
        )
        with torch.no_grad():
            generated = model.generate(**inputs, max_new_tokens=_MAX_NEW_TOKENS)
        return tokenizer.batch_decode(generated, skip_special_tokens=True)


def translate_text(text: str) -> str:
    """Traduce un único texto, preservando vacíos y reintentando salidas degeneradas."""
    if not text or not text.strip():
        return text
    result = translate_texts([text])[0].strip()
    # A long input collapsing to one character (e.g. ".") is a bad decode, not a translation.
    if len(result) <= 1 and len(text.strip()) > 1:
        result = translate_texts([text])[0].strip()
    return result or text


def get_or_create_translation(db, question, lang: str = "es"):
    """Devuelve la traducción cacheada de una pregunta, creándola si no existe."""
    from sqlalchemy.exc import IntegrityError

    from app.models import Translation

    existing = (
        db.query(Translation)
        .filter(Translation.question_id == question.id, Translation.lang == lang)
        .first()
    )
    if existing is not None:
        return existing

    translation = Translation(
        question_id=question.id,
        lang=lang,
        question_text=translate_text(question.question),
        answer_text=translate_text(question.answer),
        model_version=MODEL_VERSION,
    )
    try:
        db.add(translation)
        db.commit()
        db.refresh(translation)
    except IntegrityError:
        # Otra instancia la insertó en paralelo; reutilizamos la existente.
        db.rollback()
        return (
            db.query(Translation)
            .filter(Translation.question_id == question.id, Translation.lang == lang)
            .first()
        )
    return translation


def count_pending(db, lang: str = "es") -> int:
    """Cuenta cuántas preguntas todavía no tienen traducción en `lang`."""
    from app.models import Question, Translation

    translated_ids = db.query(Translation.question_id).filter(Translation.lang == lang)
    return db.query(Question).filter(~Question.id.in_(translated_ids)).count()


def translate_pending(
    db,
    batch_size: int = 16,
    limit: int | None = None,
    lang: str = "es",
) -> int:
    """Traduce por lotes las preguntas sin traducción. Devuelve cuántas tradujo."""
    from app.models import Question, Translation

    translated_ids = db.query(Translation.question_id).filter(Translation.lang == lang)
    query = (
        db.query(Question)
        .filter(~Question.id.in_(translated_ids))
        .order_by(Question.id)
    )
    if limit is not None:
        query = query.limit(limit)
    pending = query.all()

    total = 0
    for start in range(0, len(pending), batch_size):
        batch = pending[start : start + batch_size]
        translated_questions = translate_texts([q.question for q in batch])
        translated_answers = translate_texts([q.answer for q in batch])
        for question, question_es, answer_es in zip(
            batch, translated_questions, translated_answers
        ):
            db.add(
                Translation(
                    question_id=question.id,
                    lang=lang,
                    question_text=question_es,
                    answer_text=answer_es,
                    model_version=MODEL_VERSION,
                )
            )
        db.commit()
        total += len(batch)
    return total

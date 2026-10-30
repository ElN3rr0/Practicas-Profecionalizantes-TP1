"""
Script principal de categorización.
"""
import argparse
from tqdm import tqdm

from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import CATEGORIES, get_category_candidate_phrases, find_category_by_candidate_phrase
from app.classifier import AIClassifier
from app.human_review import (
    display_question_context,
    ask_human_for_category,
    confirm_ai_suggestion,
)

CONFIDENCE_THRESHOLD = 0.40


def get_uncategorized_questions(db) -> list:
    subquery = db.query(Categorization.question_id)
    return db.query(Question).filter(~Question.id.in_(subquery)).all()


def save_categorization(db, question_id: int, category_name: str, confidence_score: float, is_automatic: bool) -> None:
    try:
        categorization = Categorization(
            question_id=question_id,
            category_name=category_name,
            confidence_score=confidence_score,
            is_automatic=is_automatic,
        )
        db.add(categorization)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error guardando categorización: {e}")


def categorize_all(batch_size: int = 32, threshold: float = CONFIDENCE_THRESHOLD, auto_only: bool = False) -> None:
    db = SessionLocal()
    classifier = AIClassifier()
    candidate_labels = get_category_candidate_phrases()

    preguntas = get_uncategorized_questions(db)

    print("\n" + "═" * 47)
    print("  Categorizador de Preguntas con IA")
    print("═" * 47)
    print(f"  Preguntas pendientes: {len(preguntas)}")
    print(f"  Categorías: {len(CATEGORIES)}")
    print(f"  Umbral de confianza: {threshold:.0%}")
    print(f"  Modo: {'auto-only (sin revisión humana)' if auto_only else 'con revisión humana'}")
    print("═" * 47 + "\n")

    automaticas = 0
    manuales = 0
    skipped = 0

    for pregunta in tqdm(preguntas, desc="Categorizando"):
        resultado = classifier.classify(pregunta.question, candidate_labels)

        categoria_info = find_category_by_candidate_phrase(resultado.category_name)
        categoria_name_es = categoria_info["name"] if categoria_info else resultado.category_name
        categoria_label_es = categoria_info["label"] if categoria_info else resultado.category_name

        if resultado.confidence_score >= threshold:
            save_categorization(
                db, pregunta.id, categoria_name_es,
                resultado.confidence_score, is_automatic=True,
            )
            automaticas += 1
            continue

        # Confianza baja a partir de acá
        if auto_only:
            # No preguntamos nada: la dejamos sin categorizar (skip automático)
            skipped += 1
            continue

        all_scores_es = {}
        for label_en, score in resultado.all_scores.items():
            info = find_category_by_candidate_phrase(label_en)
            key = info["label"] if info else label_en
            all_scores_es[key] = score

        display_question_context(
            pregunta.question, categoria_label_es,
            resultado.confidence_score, all_scores_es,
        )

        if confirm_ai_suggestion(categoria_label_es, resultado.confidence_score):
            categoria_final = categoria_name_es
        else:
            categoria_final = ask_human_for_category(CATEGORIES)

        if categoria_final is None:
            skipped += 1
            continue

        save_categorization(
            db, pregunta.id, categoria_final,
            resultado.confidence_score, is_automatic=False,
        )
        manuales += 1

    db.close()

    print("\n" + "═" * 47)
    print("  RESUMEN DE CATEGORIZACIÓN")
    print("═" * 47)
    print(f"  Total procesadas:    {len(preguntas)}")
    print(f"  Automáticas (IA):    {automaticas}")
    print(f"  Manuales (humano):   {manuales}")
    print(f"  Omitidas (skip):     {skipped}")
    print("═" * 47)


def parse_args():
    parser = argparse.ArgumentParser(description="Categorizador de preguntas con IA")
    parser.add_argument(
        "--auto-only",
        action="store_true",
        help="Solo categoriza automáticamente (sin pedir input humano). Las de baja confianza quedan sin categorizar.",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=CONFIDENCE_THRESHOLD,
        help=f"Umbral de confianza (default: {CONFIDENCE_THRESHOLD})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    categorize_all(threshold=args.threshold, auto_only=args.auto_only)
    
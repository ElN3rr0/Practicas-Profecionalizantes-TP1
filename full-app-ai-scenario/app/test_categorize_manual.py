"""
Prueba rápida y manual del flujo de categorización con pocas preguntas.
NO es parte de la consigna del profe — es solo para validar que todo funciona
antes de correr categorize_all() sobre el dataset completo.
"""
from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import CATEGORIES, get_category_candidate_phrases, find_category_by_candidate_phrase
from app.classifier import AIClassifier
from app.human_review import (
    display_question_context,
    ask_human_for_category,
    confirm_ai_suggestion,
)
from app.categorize import get_uncategorized_questions, save_categorization

CONFIDENCE_THRESHOLD = 0.40
CANTIDAD_DE_PRUEBA = 5


def probar():
    db = SessionLocal()
    classifier = AIClassifier()
    candidate_labels = get_category_candidate_phrases()

    preguntas = get_uncategorized_questions(db)[:CANTIDAD_DE_PRUEBA]
    print(f"\nProbando con {len(preguntas)} preguntas...\n")

    for pregunta in preguntas:
        resultado = classifier.classify(pregunta.question, candidate_labels)
        info = find_category_by_candidate_phrase(resultado.category_name)
        categoria_name_es = info["name"] if info else resultado.category_name

        print(f"\nPregunta: {pregunta.question}")
        print(f"Categoría: {categoria_name_es} (confianza: {resultado.confidence_score:.0%})")

        if resultado.confidence_score >= CONFIDENCE_THRESHOLD:
            print("→ Se guardaría automático")
            save_categorization(db, pregunta.id, categoria_name_es, resultado.confidence_score, is_automatic=True)
        else:
            display_question_context(pregunta.question, categoria_name_es, resultado.confidence_score, resultado.all_scores)
            if confirm_ai_suggestion(categoria_name_es, resultado.confidence_score):
                categoria_final = categoria_name_es
            else:
                categoria_final = ask_human_for_category(CATEGORIES)

            if categoria_final:
                save_categorization(db, pregunta.id, categoria_final, resultado.confidence_score, is_automatic=False)
            else:
                print("→ Omitida (skip)")

    db.close()
    print("\nPrueba terminada. Revisá la tabla 'categorizations' en Postgres.")


if __name__ == "__main__":
    probar()
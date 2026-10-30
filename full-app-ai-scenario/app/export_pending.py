"""
Corre zero-shot sobre las preguntas pendientes: lo que supera el umbral
se guarda automático, y lo que NO supera se exporta a un JSON aparte
para que lo clasifique un LLM externo (opencode + DeepSeek).
"""
import json
from app.database import SessionLocal
from app.categories import get_category_candidate_phrases, find_category_by_candidate_phrase
from app.classifier import AIClassifier
from app.categorize import get_uncategorized_questions, save_categorization, CONFIDENCE_THRESHOLD

OUTPUT_PATH = "pending_classification.json"


def export_pending(threshold: float = CONFIDENCE_THRESHOLD):
    db = SessionLocal()
    classifier = AIClassifier()
    candidate_labels = get_category_candidate_phrases()

    preguntas = get_uncategorized_questions(db)
    pendientes = []
    automaticas = 0

    for pregunta in preguntas:
        resultado = classifier.classify(pregunta.question, candidate_labels)
        info = find_category_by_candidate_phrase(resultado.category_name)
        categoria_name_es = info["name"] if info else resultado.category_name

        if resultado.confidence_score >= threshold:
            save_categorization(db, pregunta.id, categoria_name_es, resultado.confidence_score, is_automatic=True)
            automaticas += 1
        else:
            pendientes.append({
                "question_id": pregunta.id,
                "question": pregunta.question,
                "answer": pregunta.answer,
                "zero_shot_suggestion": categoria_name_es,
                "zero_shot_confidence": round(resultado.confidence_score, 4),
            })

    db.close()

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(pendientes, f, ensure_ascii=False, indent=2)

    print(f"Automáticas (zero-shot): {automaticas}")
    print(f"Pendientes exportadas a '{OUTPUT_PATH}': {len(pendientes)}")


if __name__ == "__main__":
    export_pending()
"""
Exporta las decisiones manuales (is_automatic=False) a un CSV,
para usarlas como dataset de fine-tuning en el futuro.

Extra "Para explorar más" #2.
"""
import csv
from app.database import SessionLocal
from app.models import Question, Categorization

OUTPUT_PATH = "manual_categorizations_dataset.csv"


def exportar_dataset():
    db = SessionLocal()

    resultados = (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .filter(Categorization.is_automatic == False)
        .all()
    )
    db.close()

    if not resultados:
        print("No hay categorizaciones manuales todavía para exportar.")
        return

    with open(OUTPUT_PATH, mode="w", newline="", encoding="utf-8") as archivo:
        writer = csv.writer(archivo)
        writer.writerow(["question_id", "question", "answer", "category_name", "confidence_score_ia"])

        for question, categorization in resultados:
            writer.writerow([
                question.id,
                question.question,
                question.answer,
                categorization.category_name,
                categorization.confidence_score,
            ])

    print(f"Se exportaron {len(resultados)} categorizaciones manuales a '{OUTPUT_PATH}'")


if __name__ == "__main__":
    exportar_dataset()
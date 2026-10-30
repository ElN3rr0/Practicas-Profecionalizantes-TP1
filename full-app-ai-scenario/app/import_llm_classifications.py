"""
Importa las clasificaciones que hizo un LLM externo (opencode + DeepSeek)
sobre el archivo generado por export_pending.py.
"""
import json
from app.database import SessionLocal
from app.categorize import save_categorization
from app.categories import get_category_names

INPUT_PATH = "pending_classified.json"


def import_llm_classifications():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        clasificadas = json.load(f)

    nombres_validos = set(get_category_names())
    db = SessionLocal()

    importadas = 0
    invalidas = 0

    for item in clasificadas:
        categoria = item.get("category_name")
        if categoria not in nombres_validos:
            print(f"Categoría inválida en pregunta {item.get('question_id')}: '{categoria}' -> se omite")
            invalidas += 1
            continue

        save_categorization(
            db,
            question_id=item["question_id"],
            category_name=categoria,
            confidence_score=1.0,  # el LLM externo no devuelve un score real, marcamos confianza plena
            is_automatic=True,
        )
        importadas += 1

    db.close()
    print(f"Importadas: {importadas}, inválidas/omitidas: {invalidas}")


if __name__ == "__main__":
    import_llm_classifications()
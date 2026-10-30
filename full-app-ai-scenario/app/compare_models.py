"""
Script de comparación de modelos de zero-shot classification.
Compara bart-large-mnli vs DeBERTa-v3-base-mnli-fever-anli
en velocidad y coincidencia con las categorías ya guardadas.

NO es parte de la consigna del profe — es el extra "Para explorar más" #6.
"""
import time
from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import get_category_labels_en, find_category_by_label_en
from app.classifier import AIClassifier

MODELOS = [
    "facebook/bart-large-mnli",
    "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli",
]

CANTIDAD_MUESTRA = 30


def get_sample_with_reference(db, n: int):
    """
    Trae preguntas que YA tienen una categorización guardada, para usar
    esa categoría como referencia y ver si el modelo nuevo coincide.
    """
    return (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .limit(n)
        .all()
    )


def evaluar_modelo(model_name: str, muestra: list):
    print(f"\nCargando modelo: {model_name}...")
    classifier = AIClassifier(model_name=model_name)
    candidate_labels = get_category_labels_en()

    coincidencias = 0
    total_confianza = 0.0
    inicio = time.time()

    for question, categorization in muestra:
        resultado = classifier.classify(question.question, candidate_labels)
        info = find_category_by_label_en(resultado.category_name)
        prediccion_es = info["name"] if info else resultado.category_name

        if prediccion_es == categorization.category_name:
            coincidencias += 1
        total_confianza += resultado.confidence_score

    duracion = time.time() - inicio
    n = len(muestra)

    return {
        "modelo": model_name,
        "coincidencia": coincidencias / n,
        "confianza_promedio": total_confianza / n,
        "tiempo_total_seg": duracion,
        "tiempo_por_pregunta_seg": duracion / n,
    }


def comparar():
    db = SessionLocal()
    muestra = get_sample_with_reference(db, CANTIDAD_MUESTRA)
    db.close()

    if not muestra:
        print("No hay preguntas categorizadas todavía para usar de referencia.")
        return

    print(f"Comparando {len(MODELOS)} modelos sobre {len(muestra)} preguntas ya categorizadas...")

    resultados = [evaluar_modelo(m, muestra) for m in MODELOS]

    print("\n" + "═" * 70)
    print("  COMPARACIÓN DE MODELOS")
    print("═" * 70)
    for r in resultados:
        print(f"\n{r['modelo']}")
        print(f"  Coincidencia con categoría guardada: {r['coincidencia']:.0%}")
        print(f"  Confianza promedio: {r['confianza_promedio']:.0%}")
        print(f"  Tiempo total: {r['tiempo_total_seg']:.1f}s")
        print(f"  Tiempo por pregunta: {r['tiempo_por_pregunta_seg']:.2f}s")
    print("═" * 70)


if __name__ == "__main__":
    comparar()

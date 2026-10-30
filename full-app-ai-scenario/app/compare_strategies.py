"""
Compara la estrategia zero-shot (classifier.py) contra
Sentence Transformers + similitud coseno (classifier_embeddings.py).

Extra "Para explorar más" #1.
"""
import time
from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import CATEGORIES, get_category_labels_en, get_category_descriptions, find_category_by_label_en
from app.classifier import AIClassifier
from app.classifier_embeddings import EmbeddingClassifier

CANTIDAD_MUESTRA = 30


def get_sample_with_reference(db, n: int):
    return (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .limit(n)
        .all()
    )


def evaluar_zero_shot(muestra: list):
    print("\nEvaluando zero-shot classification (bart-large-mnli)...")
    classifier = AIClassifier()
    candidate_labels = get_category_labels_en()

    coincidencias = 0
    inicio = time.time()

    for question, categorization in muestra:
        resultado = classifier.classify(question.question, candidate_labels)
        info = find_category_by_label_en(resultado.category_name)
        prediccion_es = info["name"] if info else resultado.category_name
        if prediccion_es == categorization.category_name:
            coincidencias += 1

    duracion = time.time() - inicio
    return {"estrategia": "Zero-shot (bart-large-mnli)", "coincidencia": coincidencias / len(muestra), "tiempo_total": duracion}


def evaluar_embeddings(muestra: list):
    print("\nEvaluando Sentence Transformers + similitud coseno...")
    classifier = EmbeddingClassifier()

    # Las categorías candidatas acá son las descripciones completas, en el mismo orden que CATEGORIES
    descripciones = get_category_descriptions()
    nombres = [c["name"] for c in CATEGORIES]
    label_embeddings = classifier.encode_labels(descripciones)

    coincidencias = 0
    inicio = time.time()

    for question, categorization in muestra:
        resultado = classifier.classify(question.question, descripciones, label_embeddings)
        # resultado.category_name es la descripción ganadora -> hay que mapearla de vuelta al nombre
        indice = descripciones.index(resultado.category_name)
        prediccion_es = nombres[indice]
        if prediccion_es == categorization.category_name:
            coincidencias += 1

    duracion = time.time() - inicio
    return {"estrategia": "Embeddings + coseno (all-MiniLM-L6-v2)", "coincidencia": coincidencias / len(muestra), "tiempo_total": duracion}


def comparar():
    db = SessionLocal()
    muestra = get_sample_with_reference(db, CANTIDAD_MUESTRA)
    db.close()

    if not muestra:
        print("No hay preguntas categorizadas todavía para usar de referencia.")
        return

    print(f"Comparando estrategias sobre {len(muestra)} preguntas ya categorizadas...")

    resultados = [evaluar_zero_shot(muestra), evaluar_embeddings(muestra)]

    print("\n" + "═" * 65)
    print("  COMPARACIÓN DE ESTRATEGIAS")
    print("═" * 65)
    for r in resultados:
        n = len(muestra)
        print(f"\n{r['estrategia']}")
        print(f"  Coincidencia con categoría guardada: {r['coincidencia']:.0%}")
        print(f"  Tiempo total: {r['tiempo_total']:.1f}s ({r['tiempo_total']/n:.2f}s por pregunta)")
    print("═" * 65)


if __name__ == "__main__":
    comparar()
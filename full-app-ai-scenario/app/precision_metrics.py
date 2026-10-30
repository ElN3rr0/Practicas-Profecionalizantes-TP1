"""
Calcula qué porcentaje acertó la IA, comparando la categoría asignada
contra la categoría real de origen (guardada en el campo 'source' de
cada pregunta como "OpenTriviaQA - <categoria>").

Extra "Para explorar más" #5.
"""
from collections import defaultdict
from app.database import SessionLocal
from app.models import Question, Categorization


def extraer_categoria_real(source: str | None) -> str | None:
    """
    Extrae la categoría real desde el campo source.
    Ej: "OpenTriviaQA - historia" -> "historia"
    Retorna None si el source no tiene ese formato (ej: preguntas cargadas manualmente).
    """
    if not source or " - " not in source:
        return None
    return source.split(" - ")[-1].strip()


def calcular_precision():
    db = SessionLocal()

    resultados = (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .all()
    )
    db.close()

    total_evaluables = 0
    aciertos = 0

    # Matriz de confusión: {categoria_real: {categoria_predicha: cantidad}}
    matriz = defaultdict(lambda: defaultdict(int))

    for question, categorization in resultados:
        categoria_real = extraer_categoria_real(question.source)
        if categoria_real is None:
            continue  # no tiene formato conocido, no lo podemos evaluar

        total_evaluables += 1
        categoria_predicha = categorization.category_name
        matriz[categoria_real][categoria_predicha] += 1

        if categoria_real == categoria_predicha:
            aciertos += 1

    if total_evaluables == 0:
        print("No hay preguntas evaluables (con formato de source reconocible).")
        return

    print("\n" + "═" * 60)
    print("  MÉTRICAS DE PRECISIÓN")
    print("═" * 60)
    print(f"  Preguntas evaluables: {total_evaluables}")
    print(f"  Aciertos:             {aciertos}")
    print(f"  Precisión global:     {aciertos / total_evaluables:.1%}")
    print("═" * 60)

    print("\nPrecisión por categoría real:")
    for categoria_real in sorted(matriz.keys()):
        predicciones = matriz[categoria_real]
        total_de_esa_categoria = sum(predicciones.values())
        aciertos_de_esa_categoria = predicciones.get(categoria_real, 0)
        print(f"\n  {categoria_real} ({total_de_esa_categoria} preguntas):")
        print(f"    Acierto: {aciertos_de_esa_categoria / total_de_esa_categoria:.1%}")
        print(f"    Se confundió con:")
        for pred, cantidad in sorted(predicciones.items(), key=lambda x: -x[1]):
            if pred != categoria_real:
                print(f"      → {pred}: {cantidad} veces")


if __name__ == "__main__":
    calcular_precision()
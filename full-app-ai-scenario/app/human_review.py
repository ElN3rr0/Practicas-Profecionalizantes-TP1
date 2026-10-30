def display_question_context(question_text: str, ai_suggestion: str, confidence: float, all_scores: dict[str, float]) -> None:
    """
    Muestra al usuario la pregunta, la sugerencia de la IA, y los scores.
    """
    print("\n" + "═" * 66)
    print("REVISIÓN MANUAL REQUERIDA (confianza < 40%)")
    print("═" * 66)
    print(f"\nPregunta: {question_text}")
    print(f"\nSugerencia de la IA: {ai_suggestion} (confianza: {confidence:.0%})")
    print("\nScores de todas las categorías:")

    # Ordenamos de mayor a menor score
    ordenados = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
    for i, (cat, score) in enumerate(ordenados, 1):
        print(f"  {i}. {cat:<20} → {score:.0%}")

    print("\n" + "═" * 66)


def ask_human_for_category(categories: list[dict[str, str]]) -> str | None:
    """
    Le pide al usuario que elija una categoría por consola.
    Retorna el "name" de la categoría elegida, o None si eligió skip.
    """
    print("\nOpciones:")
    for i, cat in enumerate(categories, 1):
        print(f"  {i}. {cat['label']}")
    print("  S. Skip (omitir esta pregunta)")

    while True:
        eleccion = input("\nElegí una opción: ").strip()

        if eleccion.lower() == "s":
            return None

        if eleccion.isdigit():
            indice = int(eleccion) - 1
            if 0 <= indice < len(categories):
                return categories[indice]["name"]

        print("Entrada inválida, probá de nuevo (número de la lista o 'S' para skip).")


def confirm_ai_suggestion(ai_suggestion: str, confidence: float) -> bool:
    """
    Pregunta al usuario si acepta la sugerencia de la IA.
    """
    respuesta = input(f'\n¿Aceptás la sugerencia "{ai_suggestion}" ({confidence:.0%})? [S/n]: ').strip().lower()
    return respuesta in ("", "s", "si", "sí")
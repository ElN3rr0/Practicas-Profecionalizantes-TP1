CATEGORIES: list[dict[str, str]] = [
    {
        "name": "ciencia",
        "label": "Ciencia",
        "label_en": "science",
        "candidate_phrase_en": "science, technology and medicine",
        "description": "Preguntas sobre biología, química, física, astronomía, tecnología, medicina y descubrimientos científicos."
    },
    {
        "name": "arte",
        "label": "Arte",
        "label_en": "art",
        "candidate_phrase_en": "art, literature and philosophy",
        "description": "Pinturas, esculturas, libros, autores y corrientes filosóficas — no incluye películas ni series basadas en esas obras, eso es entretenimiento."
    },
    {
        "name": "historia",
        "label": "Historia",
        "label_en": "history",
        "candidate_phrase_en": "historical events, wars and empires of the past",
        "description": "Guerras, batallas, revoluciones y personajes históricos del pasado — no incluye países o ubicaciones actuales, eso es geografía."
    },
    {
        "name": "entretenimiento",
        "label": "Entretenimiento",
        "label_en": "entertainment",
        "candidate_phrase_en": "movies, music, television and celebrities",
        "description": "Preguntas sobre películas, música, televisión, celebridades y cultura pop."
    },
    {
        "name": "deportes",
        "label": "Deportes",
        "label_en": "sports",
        "candidate_phrase_en": "sports and athletic competitions",
        "description": "Preguntas sobre atletas, equipos, competencias deportivas y reglas de deportes."
    },
    {
        "name": "geografia",
        "label": "Geografía",
        "label_en": "geography",
        "candidate_phrase_en": "countries, capitals and physical geographic locations",
        "description": "Países, capitales, ríos y montañas del mundo actual — no incluye eventos históricos ni imperios pasados, eso es historia."
    },
]


def get_category_names() -> list[str]:
    """Retorna una lista con los nombres (name) de todas las categorías."""
    return [c["name"] for c in CATEGORIES]


def get_category_labels() -> list[str]:
    """Retorna una lista con los labels legibles (en español) de todas las categorías."""
    return [c["label"] for c in CATEGORIES]


def get_category_labels_en() -> list[str]:
    """Labels cortos en inglés (una palabra) — se usan en compare_models.py / compare_strategies.py."""
    return [c["label_en"] for c in CATEGORIES]


def get_category_candidate_phrases() -> list[str]:
    """Frases descriptivas en inglés — se usan como candidate_labels del clasificador principal,
    porque dan más contexto al modelo NLI que una sola palabra."""
    return [c["candidate_phrase_en"] for c in CATEGORIES]


def get_category_descriptions() -> list[str]:
    """Retorna una lista con las descripciones de todas las categorías."""
    return [c["description"] for c in CATEGORIES]


def find_category_by_name(name: str) -> dict | None:
    """Busca y retorna una categoría por su nombre. Retorna None si no existe."""
    for c in CATEGORIES:
        if c["name"] == name:
            return c
    return None


def find_category_by_label_en(label_en: str) -> dict | None:
    """Busca la categoría a partir del label corto en inglés."""
    for c in CATEGORIES:
        if c["label_en"] == label_en:
            return c
    return None


def find_category_by_candidate_phrase(phrase: str) -> dict | None:
    """Busca la categoría a partir de la frase candidata que devolvió el modelo."""
    for c in CATEGORIES:
        if c["candidate_phrase_en"] == phrase:
            return c
    return None
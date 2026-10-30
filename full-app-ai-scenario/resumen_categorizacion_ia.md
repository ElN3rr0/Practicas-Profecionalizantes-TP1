# Sistema de Categorización de Preguntas con IA — Resumen del proyecto

**Autor:** Sebastián Rivero
**Materia:** Práctica Profesionalizante
**Base:** API de preguntas con FastAPI (`fastapi-questions`)

> **Aclaración:** Este resumen documenta el trabajo completo que hice sobre el ejercicio de categorización con IA que nos dio el profe (rama `main-category` del repo `full-app-ai-scenario`). Lo armé con la ayuda de Claude (Anthropic), que me guió paso a paso, me explicó los conceptos, y me ayudó a resolver los errores que me fueron saliendo en el camino. Todo el código está corrido y probado en mi máquina.

---

## 1. Contexto y decisiones iniciales

Mi proyecto base ya tenía una API CRUD de preguntas (FastAPI + SQLAlchemy + PostgreSQL en Docker) cargada con datos. El profe pidió agregarle un sistema de clasificación de preguntas con IA, con revisión humana cuando la IA no está segura (Human-in-the-Loop).

### Cambio de dataset

El profe pidió específicamente que usemos un dataset estilo "Preguntados", con estas 6 categorías: **Ciencia, Arte, Historia, Entretenimiento, Deportes y Geografía**. Mi dataset original (Jeopardy) no calzaba bien con eso, así que con Claude buscamos una alternativa y encontramos **`rlyapin/OpenTriviaQA`** en Hugging Face, que viene separado en subcarpetas por tema.

Como esas subcarpetas no coinciden 1 a 1 con las 6 categorías pedidas (por ejemplo, no existe una carpeta "arte" como tal), armamos este mapeo, basado en que "Arte" en el Trivial Pursuit clásico (de donde sale el formato "Preguntados") en realidad siempre va combinado con Literatura:

| Categoría del profe | Subcarpetas de OpenTriviaQA combinadas |
|---|---|
| ciencia | `science-technology` |
| arte | `literature`, `humanities` |
| historia | `history` |
| entretenimiento | `entertainment`, `movies`, `music`, `television`, `celebrities` |
| deportes | `sports` |
| geografia | `geography`, `world` |

---

## 2. Archivos del ejercicio base (Pasos 1 a 9)

### `app/categories.py` — Definición de las 6 categorías

Acá defino las categorías con su nombre interno, label legible, descripción (que usa la IA para entender de qué trata cada una) y un `label_en` — esto último lo agregué después para arreglar un problema de idioma que cuento más abajo.

```python
CATEGORIES: list[dict[str, str]] = [
    {
        "name": "ciencia",
        "label": "Ciencia",
        "label_en": "science",
        "description": "Preguntas sobre biología, química, física, astronomía, tecnología, medicina y descubrimientos científicos."
    },
    {
        "name": "arte",
        "label": "Arte",
        "label_en": "art",
        "description": "Preguntas sobre pintura, escultura, literatura, escritores, novelas, filosofía y humanidades en general."
    },
    {
        "name": "historia",
        "label": "Historia",
        "label_en": "history",
        "description": "Preguntas sobre eventos históricos, guerras, personajes históricos, imperios y revoluciones."
    },
    {
        "name": "entretenimiento",
        "label": "Entretenimiento",
        "label_en": "entertainment",
        "description": "Preguntas sobre películas, música, televisión, celebridades y cultura pop."
    },
    {
        "name": "deportes",
        "label": "Deportes",
        "label_en": "sports",
        "description": "Preguntas sobre atletas, equipos, competencias deportivas y reglas de deportes."
    },
    {
        "name": "geografia",
        "label": "Geografía",
        "label_en": "geography",
        "description": "Preguntas sobre países, capitales, ríos, montañas, océanos y ubicaciones del mundo."
    },
]


def get_category_names() -> list[str]:
    """Devuelve los nombres internos de las categorías (español)."""
    return [c["name"] for c in CATEGORIES]


def get_category_labels() -> list[str]:
    """Devuelve los labels legibles en español, para mostrar por consola."""
    return [c["label"] for c in CATEGORIES]


def get_category_labels_en() -> list[str]:
    """Labels en inglés — son los que le paso al modelo de IA como candidate_labels."""
    return [c["label_en"] for c in CATEGORIES]


def get_category_descriptions() -> list[str]:
    """Devuelve las descripciones completas (usadas también en la estrategia de embeddings)."""
    return [c["description"] for c in CATEGORIES]


def find_category_by_name(name: str) -> dict | None:
    """Busca una categoría por su nombre interno."""
    for c in CATEGORIES:
        if c["name"] == name:
            return c
    return None


def find_category_by_label_en(label_en: str) -> dict | None:
    """Busca una categoría a partir del label en inglés que devuelve el modelo."""
    for c in CATEGORIES:
        if c["label_en"] == label_en:
            return c
    return None
```

### `app/models.py` — Modelo `Categorization`

Este modelo guarda cada decisión de categorización (automática o manual) con su relación a la pregunta original.

```python
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    source = Column(String(255), nullable=True)


class Categorization(Base):
    __tablename__ = "categorizations"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    category_name = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    is_automatic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    question = relationship("Question", backref="categorizations")
```

**Detalle importante:** usé `default=lambda: datetime.now(timezone.utc)` en vez de `default=datetime.now(timezone.utc)` — si le paso la función ya ejecutada, Python la evalúa una sola vez al arrancar el proceso, y todas las filas tendrían el mismo timestamp fijo. Con el `lambda`, se ejecuta de nuevo en cada inserción.

### `app/classifier.py` — El clasificador con IA (zero-shot)

Envuelve el pipeline de `zero-shot-classification` de Hugging Face.

```python
from dataclasses import dataclass
from transformers import pipeline


@dataclass
class ClassificationResult:
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class AIClassifier:
    """
    Usa un modelo de NLI (Natural Language Inference) para evaluar,
    para cada categoría candidata, si el texto "implica" esa categoría.
    La que tiene mayor score de implicación, gana.
    """

    def __init__(self, model_name: str = "facebook/bart-large-mnli"):
        print(f"Cargando modelo de IA... (puede tardar la primera vez)")
        self.model_name = model_name
        self.pipeline = pipeline("zero-shot-classification", model=model_name)
        print(f"Modelo cargado: {model_name}")

    def classify(self, text: str, candidate_labels: list[str]) -> ClassificationResult:
        result = self.pipeline(text, candidate_labels=candidate_labels)

        category_name = result["labels"][0]
        confidence_score = result["scores"][0]
        all_scores = dict(zip(result["labels"], result["scores"]))

        return ClassificationResult(
            category_name=category_name,
            confidence_score=confidence_score,
            all_scores=all_scores,
        )

    def classify_batch(self, texts: list[str], candidate_labels: list[str]) -> list[ClassificationResult]:
        """Clasifica varios textos, uno por uno (versión simple sin batching nativo)."""
        results = []
        for text in texts:
            results.append(self.classify(text, candidate_labels))
        return results
```

### `app/human_review.py` — Interacción humana por consola

Estas 3 funciones se activan cuando la IA no tiene suficiente confianza.

```python
def display_question_context(question_text: str, ai_suggestion: str, confidence: float, all_scores: dict[str, float]) -> None:
    """Muestra la pregunta, la sugerencia de la IA, y el desglose de scores por categoría."""
    print("\n" + "═" * 66)
    print("REVISIÓN MANUAL REQUERIDA (confianza < 40%)")
    print("═" * 66)
    print(f"\nPregunta: {question_text}")
    print(f"\nSugerencia de la IA: {ai_suggestion} (confianza: {confidence:.0%})")
    print("\nScores de todas las categorías:")

    ordenados = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
    for i, (cat, score) in enumerate(ordenados, 1):
        print(f"  {i}. {cat:<20} → {score:.0%}")

    print("\n" + "═" * 66)


def ask_human_for_category(categories: list[dict[str, str]]) -> str | None:
    """Pide elegir una categoría de la lista, o 'S' para saltear. Vuelve a preguntar si la entrada no es válida."""
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
    """Pregunta si se acepta la sugerencia de la IA. Enter vacío o 's'/'si' cuenta como sí."""
    respuesta = input(f'\n¿Aceptás la sugerencia "{ai_suggestion}" ({confidence:.0%})? [S/n]: ').strip().lower()
    return respuesta in ("", "s", "si", "sí")
```

### `app/categorize.py` — El orquestador principal

Ata todo el flujo: clasifica cada pregunta, decide si es automática o si necesita revisión humana, y guarda el resultado. Incluye el modo `--auto-only` que agregué como extra (punto 3 de "Para explorar más").

```python
"""
Script principal de categorización.
"""
import argparse
from tqdm import tqdm

from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import CATEGORIES, get_category_labels_en, find_category_by_label_en
from app.classifier import AIClassifier
from app.human_review import (
    display_question_context,
    ask_human_for_category,
    confirm_ai_suggestion,
)

CONFIDENCE_THRESHOLD = 0.40  # el profe me pidió bajarlo de 70% a 40%


def get_uncategorized_questions(db) -> list:
    """Trae las preguntas que todavía NO tienen una entrada en categorizations (patrón NOT IN con subquery)."""
    subquery = db.query(Categorization.question_id)
    return db.query(Question).filter(~Question.id.in_(subquery)).all()


def save_categorization(db, question_id: int, category_name: str, confidence_score: float, is_automatic: bool) -> None:
    """Guarda una categorización, con manejo de errores por si falla el commit."""
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
    """
    Recorre todas las preguntas sin categorizar:
    - Si el score de la IA >= threshold: se guarda automático.
    - Si no: se pide revisión humana por consola (salvo que auto_only=True, en cuyo caso se saltea).
    """
    db = SessionLocal()
    classifier = AIClassifier()
    candidate_labels = get_category_labels_en()

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

        # El modelo devuelve el label en inglés (ej: "science") -> lo traduzco a español
        categoria_info = find_category_by_label_en(resultado.category_name)
        categoria_name_es = categoria_info["name"] if categoria_info else resultado.category_name
        categoria_label_es = categoria_info["label"] if categoria_info else resultado.category_name

        if resultado.confidence_score >= threshold:
            save_categorization(
                db, pregunta.id, categoria_name_es,
                resultado.confidence_score, is_automatic=True,
            )
            automaticas += 1
            continue

        if auto_only:
            skipped += 1
            continue

        all_scores_es = {}
        for label_en, score in resultado.all_scores.items():
            info = find_category_by_label_en(label_en)
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
    parser.add_argument("--auto-only", action="store_true", help="Solo categoriza automáticamente, sin pedir input humano.")
    parser.add_argument("--threshold", type=float, default=CONFIDENCE_THRESHOLD, help=f"Umbral de confianza (default: {CONFIDENCE_THRESHOLD})")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    categorize_all(threshold=args.threshold, auto_only=args.auto_only)
```

### `app/main.py` — Endpoints nuevos

Le agregué a mi API existente 4 endpoints relacionados a la categorización (los 3 que pedía el ejercicio, más el del extra 4):

```python
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db, engine
from app.models import Base, Question, Categorization
from app.categories import CATEGORIES
from pydantic import BaseModel


class QuestionCreate(BaseModel):
    question: str
    answer: str
    category: str | None = None
    source: str | None = None


class CategorizationUpdate(BaseModel):
    category_name: str


# ... (endpoints CRUD de preguntas sin cambios) ...


@app.get("/questions/category/{category_name}")
def list_by_category(category_name: str, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """
    Trae las preguntas categorizadas con una categoría específica, haciendo
    JOIN entre Question y Categorization. Reemplazó al endpoint viejo que
    filtraba directo por Question.category (columna que ya no uso).
    """
    results = (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .filter(Categorization.category_name == category_name)
        .offset(skip)
        .limit(limit)
        .all()
    )

    if not results:
        return {"error": f"No se encontraron preguntas para la categoría: {category_name}"}

    response = []
    for question, categorization in results:
        response.append({
            "id": question.id,
            "question": question.question,
            "answer": question.answer,
            "source": question.source,
            "category_name": categorization.category_name,
            "confidence_score": categorization.confidence_score,
            "is_automatic": categorization.is_automatic,
        })
    return response


@app.get("/categories")
def list_categories():
    """Devuelve la lista completa de categorías definidas."""
    return CATEGORIES


@app.get("/categories/stats")
def category_stats(db: Session = Depends(get_db)):
    """Estadísticas globales: total, categorizadas, automáticas/manuales, y desglose por categoría."""
    total_questions = db.query(Question).count()
    categorized = db.query(Categorization.question_id).distinct().count()
    uncategorized = total_questions - categorized
    automatic = db.query(Categorization).filter(Categorization.is_automatic == True).count()
    manual = db.query(Categorization).filter(Categorization.is_automatic == False).count()

    by_category_raw = (
        db.query(Categorization.category_name, func.count(Categorization.id))
        .group_by(Categorization.category_name)
        .all()
    )
    by_category = {name: count for name, count in by_category_raw}

    return {
        "total_questions": total_questions,
        "categorized": categorized,
        "uncategorized": uncategorized,
        "automatic": automatic,
        "manual": manual,
        "by_category": by_category,
    }


@app.put("/categorizations/{categorization_id}")
def update_categorization(categorization_id: int, data: CategorizationUpdate, db: Session = Depends(get_db)):
    """
    Extra (punto 4): permite corregir manualmente una categorización ya guardada.
    Valida que la categoría nueva sea una de las 6 definidas, y marca is_automatic=False
    porque, al intervenir un humano, deja de ser una decisión puramente automática.
    """
    categorization = db.query(Categorization).filter(Categorization.id == categorization_id).first()
    if not categorization:
        return {"error": "Categorización no encontrada"}

    nombres_validos = [c["name"] for c in CATEGORIES]
    if data.category_name not in nombres_validos:
        return {"error": f"Categoría inválida: '{data.category_name}'. Válidas: {nombres_validos}"}

    categorization.category_name = data.category_name
    categorization.is_automatic = False

    db.commit()
    db.refresh(categorization)

    return {
        "id": categorization.id,
        "question_id": categorization.question_id,
        "category_name": categorization.category_name,
        "confidence_score": categorization.confidence_score,
        "is_automatic": categorization.is_automatic,
    }
```

### `app/load_data.py` — Carga desde OpenTriviaQA

```python
import pandas as pd
import requests
import tempfile
import os
from app.database import SessionLocal, engine
from app.models import Base, Question

BASE_URL = "https://huggingface.co/datasets/rlyapin/OpenTriviaQA/resolve/main"

CATEGORY_MAP = {
    "ciencia": ["science-technology"],
    "arte": ["literature", "humanities"],
    "historia": ["history"],
    "entretenimiento": ["entertainment", "movies", "music", "television", "celebrities"],
    "deportes": ["sports"],
    "geografia": ["geography", "world"],
}


def download_parquet(url: str) -> str:
    r = requests.get(url, stream=True)
    r.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".parquet")
    tmp.write(r.content)
    tmp.close()
    return tmp.name


def load_topic(topic: str) -> pd.DataFrame:
    url = f"{BASE_URL}/{topic}/data.parquet"
    path = download_parquet(url)
    df = pd.read_parquet(path)
    os.unlink(path)
    return df


def load_questions(limit_per_category: int | None = 34):
    """Descarga cada topic de OpenTriviaQA mapeado a mis 6 categorías, y carga las preguntas.
    Dejo category=None a propósito, para que la IA las clasifique después."""
    Base.metadata.create_all(bind=engine)

    all_rows = []
    for category, topics in CATEGORY_MAP.items():
        dfs = [load_topic(t) for t in topics]
        df_cat = pd.concat(dfs, ignore_index=True)

        if limit_per_category:
            df_cat = df_cat.sample(n=min(limit_per_category, len(df_cat)), random_state=42)

        for _, row in df_cat.iterrows():
            all_rows.append({
                "question": row.get("question", ""),
                "answer": row.get("answer", ""),
                "source": f"OpenTriviaQA - {category}",  # acá queda la categoría REAL de origen
            })

    session = SessionLocal()
    try:
        for row in all_rows:
            question = Question(
                question=row["question"],
                answer=row["answer"],
                category=None,
                source=row["source"],
            )
            session.add(question)
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    load_questions()
```

**Detalle clave:** guardé la categoría real de origen dentro del campo `source` (`"OpenTriviaQA - historia"`, etc.), sin saberlo en ese momento esto me sirvió después para medir precisión (punto 5 de los extras).

---

## 3. Resultado de correr el sistema

Cargué 204 preguntas (34 por categoría) y corrí `categorize_all()` con umbral 40%:

```
═══════════════════════════════════════════════
  RESUMEN DE CATEGORIZACIÓN
═══════════════════════════════════════════════
  Total procesadas:    204
  Automáticas (IA):    146
  Manuales (humano):   58
  Omitidas (skip):     0
═══════════════════════════════════════════════
```

Y verificando con `/categories/stats`:

```json
{"total_questions":204,"categorized":204,"uncategorized":0,"automatic":146,"manual":58,
"by_category":{"arte":19,"deportes":34,"entretenimiento":43,"historia":52,"geografia":20,"ciencia":36}}
```

### Un problema que encontré y solucioné: idioma mezclado

Mis preguntas (de OpenTriviaQA) están en **inglés**, pero mis categorías estaban definidas en **español**. Esto es un problema real para zero-shot classification: el modelo `bart-large-mnli` fue entrenado en inglés (dataset MNLI), y evaluar una hipótesis como *"This example is ciencia"* (mezclando idiomas) le baja mucho la calidad de la clasificación.

La solución fue agregar `label_en` a cada categoría, y usar esos labels en inglés como `candidate_labels` al llamar al modelo, traduciendo el resultado de vuelta a español solo para guardar/mostrar. Esto está reflejado en `find_category_by_label_en()` y en cómo lo uso dentro de `categorize_all()`.

---

## 4. Los 6 extras de "Para explorar más"

### Extra 3: Modo `--auto-only`

Ya está incluido arriba, dentro de `categorize.py` — agregué `argparse` con un flag `--auto-only` que, si está activo, no pide revisión humana: las preguntas de baja confianza directamente quedan sin categorizar (skip automático). Sirve para correr el categorizador desatendido.

```bash
poetry run python -m app.categorize --auto-only
poetry run python -m app.categorize --auto-only --threshold 0.5
```

### Extra 4: `PUT /categorizations/{id}`

También ya incluido arriba, dentro de `main.py`. Probado con:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/categorizations/1" -Method Put -ContentType "application/json" -Body '{"category_name": "historia"}'
```

Funciona, valida categorías inválidas, y marca `is_automatic=False` al corregir a mano.

### Extra 6: Comparar `bart-large-mnli` vs `DeBERTa-v3-base-mnli-fever-anli`

```python
"""
Compara dos modelos de zero-shot classification en velocidad y coincidencia
con las categorías ya guardadas en la base.
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
    return (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .limit(n)
        .all()
    )


def evaluar_modelo(model_name: str, muestra: list):
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
        "tiempo_por_pregunta_seg": duracion / n,
    }


def comparar():
    db = SessionLocal()
    muestra = get_sample_with_reference(db, CANTIDAD_MUESTRA)
    db.close()
    for modelo in MODELOS:
        r = evaluar_modelo(modelo, muestra)
        print(r)


if __name__ == "__main__":
    comparar()
```

**Resultado:**

| Modelo | Coincidencia | Confianza prom. | Tiempo/pregunta |
|---|---|---|---|
| bart-large-mnli | 80% | 58% | 1.68s |
| DeBERTa-v3-base | 63% | 63% | 5.21s |

**Aclaración importante:** la métrica de "coincidencia" está sesgada a favor de bart, porque las categorías guardadas en mi base fueron generadas mayormente por el propio bart (y mis correcciones manuales, basadas en sus sugerencias). O sea, no mide qué modelo "acierta más" en términos absolutos, sino cuánto se parece DeBERTa a lo que ya dijo bart. Lo que sí es una medición objetiva y confiable es la **velocidad**: bart fue ~3 veces más rápido que DeBERTa en mi máquina.

### Extra 5: Métricas de precisión (contra la categoría real de origen)

Acá aproveché que guardé la categoría real dentro del campo `source` al cargar los datos (`"OpenTriviaQA - historia"`), algo que en su momento hice por prolijidad y terminó siendo clave para este extra.

```python
"""
Calcula qué % acertó la IA comparando la categoría asignada contra
la categoría real de origen (guardada en el campo 'source').
"""
from collections import defaultdict
from app.database import SessionLocal
from app.models import Question, Categorization


def extraer_categoria_real(source: str | None) -> str | None:
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
    matriz = defaultdict(lambda: defaultdict(int))

    for question, categorization in resultados:
        categoria_real = extraer_categoria_real(question.source)
        if categoria_real is None:
            continue

        total_evaluables += 1
        categoria_predicha = categorization.category_name
        matriz[categoria_real][categoria_predicha] += 1

        if categoria_real == categoria_predicha:
            aciertos += 1

    print(f"Precisión global: {aciertos / total_evaluables:.1%}")

    for categoria_real in sorted(matriz.keys()):
        predicciones = matriz[categoria_real]
        total = sum(predicciones.values())
        acierto = predicciones.get(categoria_real, 0) / total
        print(f"{categoria_real}: {acierto:.1%} de acierto")


if __name__ == "__main__":
    calcular_precision()
```

**Resultado — Precisión global: 66.7% (136/204 aciertos)**

| Categoría | Acierto |
|---|---|
| Deportes | 88.2% |
| Ciencia | 79.4% |
| Entretenimiento | 76.5% |
| Historia | 70.6% |
| Arte | 44.1% |
| Geografía | 41.2% |

**El hallazgo más interesante:** "historia" actúa como una especie de categoría "imán" — 29 preguntas de otras categorías (14 de geografía, 6 de arte, 4 de deportes, 3 de entretenimiento, 2 de ciencia) terminaron clasificadas erróneamente como historia. Esto tiene sentido si miro las descripciones que le puse a las categorías: "historia" incluye "imperios" y "eventos históricos", que se solapan fuerte con "países/ubicaciones" (geografía) — trivia de geografía real casi siempre tiene contexto histórico de por medio (imperios que gobernaron tal territorio, capitales que cambiaron de nombre por guerras, etc.).

### Extra 1: Sentence Transformers + similitud coseno

Estrategia alternativa: en vez de razonamiento tipo NLI, convierto texto a embeddings (vectores numéricos) y comparo por similitud coseno.

```python
"""
Estrategia alternativa: Sentence Transformers + similitud coseno,
en vez de zero-shot classification (NLI).
"""
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


@dataclass
class ClassificationResult:
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class EmbeddingClassifier:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def classify(self, text: str, candidate_labels: list[str], label_embeddings: np.ndarray | None = None) -> ClassificationResult:
        if label_embeddings is None:
            label_embeddings = self.model.encode(candidate_labels)

        text_embedding = self.model.encode([text])
        similitudes = cosine_similarity(text_embedding, label_embeddings)[0]
        similitudes = np.clip(similitudes, 0, 1)

        indice_ganador = int(np.argmax(similitudes))
        return ClassificationResult(
            category_name=candidate_labels[indice_ganador],
            confidence_score=float(similitudes[indice_ganador]),
            all_scores=dict(zip(candidate_labels, similitudes.tolist())),
        )

    def encode_labels(self, candidate_labels: list[str]) -> np.ndarray:
        return self.model.encode(candidate_labels)
```

**Resultado — Zero-shot vs Embeddings:**

| Estrategia | Coincidencia | Tiempo/pregunta |
|---|---|---|
| Zero-shot (bart) | 80% | 1.87s |
| Embeddings + coseno | 47% | **0.02s** |

**Conclusión:** embeddings + similitud coseno es **~93 veces más rápido** que zero-shot, a costa de bastante precisión (de nuevo, con la misma salvedad de que la "coincidencia" favorece a bart por cómo se armó la referencia). En un dataset masivo (decenas de miles de preguntas) donde 1.87s por pregunta sería inviable en tiempo, embeddings sería la opción más práctica.

### Extra 2: CSV para futuro fine-tuning

Exporto solo las categorizaciones manuales (`is_automatic=False`), porque son las que reflejan juicio humano real y tendrían sentido como dataset de entrenamiento.

```python
"""
Exporta las decisiones manuales a un CSV, para usarlas como
dataset de fine-tuning en el futuro.
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

    with open(OUTPUT_PATH, mode="w", newline="", encoding="utf-8") as archivo:
        writer = csv.writer(archivo)
        writer.writerow(["question_id", "question", "answer", "category_name", "confidence_score_ia"])
        for question, categorization in resultados:
            writer.writerow([
                question.id, question.question, question.answer,
                categorization.category_name, categorization.confidence_score,
            ])


if __name__ == "__main__":
    exportar_dataset()
```

---

## 5. Tests

Ya tenía una suite de tests con `pytest` (unitarios, de integración, de calidad de datos y de reglas de negocio). Tuve que actualizar uno solo, `test_validation_business.py`, porque el endpoint `/questions/category/{cat}` cambió su lógica interna: antes filtraba directo por `Question.category`, y ahora hace JOIN contra la tabla `Categorization`. El test original armaba el escenario seteando `Question.category` a mano, lo cual ya no reflejaba cómo funciona el sistema — lo reescribí para que cree registros de `Categorization` en su lugar.

Con eso, los 14 tests pasan correctamente:

```
14 passed, 3 warnings in 43.91s
```

---

## 6. Conclusión

Terminé con un sistema de categorización de preguntas con IA completo: zero-shot classification con revisión humana cuando la confianza es baja, persistencia en base de datos, endpoints para consultar y corregir resultados, y los 6 extras del enunciado implementados y medidos con datos reales de mi propio dataset. Lo más valioso que me llevo del ejercicio es haber visto en la práctica el trade-off entre precisión y velocidad (zero-shot vs embeddings), y cómo el solapamiento semántico entre categorías (historia/geografía, arte/entretenimiento) afecta directamente los resultados de un clasificador zero-shot, sin necesidad de entrenar nada.

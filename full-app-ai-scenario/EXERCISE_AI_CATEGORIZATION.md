# EXERCISE — Categorización con IA (Paso a Paso)

Guía secuencial para construir un sistema que categorice preguntas usando IA, con intervención humana cuando la confianza sea baja.

> **Prerequisito:** haber completado el ejercicio base (API de preguntas funcionando con datos cargados en PostgreSQL).

---

## Requisitos previos

- Proyecto base funcionando (API + BD con preguntas cargadas)
- Python 3.10+
- Docker corriendo con PostgreSQL

Verificá que la BD tenga datos:

```bash
docker compose exec db psql -U admin -d questions_db -c "SELECT COUNT(*) FROM questions;"
```

---

## Paso 1: Agregar dependencias de IA

```bash
poetry add transformers torch sentence-transformers scikit-learn tqdm
```

| Paquete | Para qué lo usamos |
|---|---|
| `transformers` | Pipeline de zero-shot classification (Hugging Face) |
| `torch` | Backend de cómputo para los modelos |
| `sentence-transformers` | Generar embeddings de texto |
| `scikit-learn` | Calcular similitud coseno |
| `tqdm` | Barras de progreso en consola |

> **Nota:** La primera vez que corras el clasificador, se va a descargar el modelo (~1.5 GB para `facebook/bart-large-mnli`). Necesitás conexión a internet.

---

## Paso 2: Definir las categorías

Creá el archivo de configuración de categorías.

### `app/categories.py`

```python
"""
Definición centralizada de las categorías disponibles para clasificación.

Cada categoría tiene:
- name: identificador interno (snake_case)
- label: nombre legible para mostrar al usuario
- description: texto que la IA usa para entender el significado de la categoría

TAREA: Definí al menos 6 categorías relevantes para el dataset de preguntas.
       Pensá en categorías que sean mutuamente excluyentes y que cubran
       la mayor cantidad posible de preguntas.

Ejemplo de estructura:

CATEGORIES = [
    {
        "name": "machine_learning",
        "label": "Machine Learning",
        "description": "Preguntas sobre algoritmos de aprendizaje automático, redes neuronales, overfitting, gradient descent, etc."
    },
    {
        "name": "historia",
        "label": "Historia",
        "description": "Preguntas sobre eventos históricos, personajes, guerras, civilizaciones, etc."
    },
    # ... más categorías
]
"""

# TODO: Implementar la lista CATEGORIES con al menos 6 categorías.
#       Cada categoría debe ser un diccionario con las claves: "name", "label", "description".
#       Las descripciones deben ser claras y detalladas para que la IA pueda usarlas
#       como referencia al momento de clasificar.

CATEGORIES: list[dict[str, str]] = []


def get_category_names() -> list[str]:
    """Retorna una lista con los nombres (name) de todas las categorías."""
    # TODO: Implementar. Debe retornar algo como ["machine_learning", "historia", ...]
    pass


def get_category_labels() -> list[str]:
    """Retorna una lista con los labels legibles de todas las categorías."""
    # TODO: Implementar.
    pass


def get_category_descriptions() -> list[str]:
    """Retorna una lista con las descripciones de todas las categorías."""
    # TODO: Implementar.
    pass


def find_category_by_name(name: str) -> dict | None:
    """Busca y retorna una categoría por su nombre. Retorna None si no existe."""
    # TODO: Implementar.
    pass
```

---

## Paso 3: Crear el modelo de datos para las categorizaciones

### `app/models.py` — Agregar el modelo `Categorization`

Agregá este modelo **al archivo `models.py` existente**, debajo del modelo `Question`:

```python
# --- Agregar estas importaciones al inicio del archivo (si no están) ---
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


# --- Agregar este modelo debajo de la clase Question ---

class Categorization(Base):
    """
    Registra la categorización de cada pregunta.
    Guarda tanto las decisiones automáticas de la IA como las manuales del humano.

    TAREA: Completar las columnas del modelo.

    Columnas requeridas:
    - id: clave primaria autoincremental (Integer)
    - question_id: FK a questions.id (Integer, ForeignKey)
    - category_name: nombre de la categoría asignada (String(100))
    - confidence_score: score de confianza de la IA, entre 0.0 y 1.0 (Float)
    - is_automatic: True si la IA decidió, False si decidió un humano (Boolean)
    - created_at: timestamp de cuándo se hizo la categorización (DateTime)

    Relación:
    - question: relación con el modelo Question (relationship)
    """
    __tablename__ = "categorizations"

    # TODO: Definir las columnas id, question_id, category_name,
    #       confidence_score, is_automatic, created_at.
    #
    # Pistas:
    #   - Usá ForeignKey("questions.id") para la FK
    #   - Usá default=True para is_automatic
    #   - Usá default=datetime.now(timezone.utc) o un callable para created_at
    #   - Definí una relationship("Question", backref="categorizations")

    pass
```

---

## Paso 4: Implementar el clasificador con IA

Creá el módulo que encapsula la lógica de clasificación.

### `app/classifier.py`

```python
"""
Módulo de clasificación de texto usando IA.

Este módulo provee dos estrategias de clasificación:
1. Zero-shot classification con transformers (más preciso, más lento)
2. Sentence embeddings + similitud coseno (más rápido, menos preciso)

TAREA: Implementar la clase AIClassifier con los métodos indicados.
"""
from dataclasses import dataclass


@dataclass
class ClassificationResult:
    """
    Resultado de una clasificación.

    Atributos:
        category_name: nombre de la categoría asignada
        confidence_score: score de confianza (0.0 a 1.0)
        all_scores: diccionario con los scores de todas las categorías
    """
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class AIClassifier:
    """
    Clasificador de texto basado en IA.

    Usa el pipeline zero-shot-classification de Hugging Face para asignar
    una categoría a un texto dado.

    TAREA: Implementar los métodos __init__, classify, y classify_batch.

    Ejemplo de uso esperado:
        classifier = AIClassifier(model_name="facebook/bart-large-mnli")
        result = classifier.classify(
            text="¿Qué es el overfitting?",
            candidate_labels=["machine_learning", "historia", "geografía"]
        )
        print(result.category_name)       # "machine_learning"
        print(result.confidence_score)    # 0.92
    """

    def __init__(self, model_name: str = "facebook/bart-large-mnli"):
        """
        Inicializa el clasificador cargando el modelo de Hugging Face.

        Args:
            model_name: nombre del modelo en Hugging Face Hub.

        TODO:
        - Importar pipeline de transformers
        - Crear self.pipeline usando pipeline("zero-shot-classification", model=model_name)
        - Guardar el model_name como atributo

        Pista: La carga del modelo puede tardar la primera vez (descarga ~1.5GB).
               Mostrá un print indicando que se está cargando.
        """
        # TODO: Implementar
        pass

    def classify(self, text: str, candidate_labels: list[str]) -> ClassificationResult:
        """
        Clasifica un texto individual contra una lista de categorías candidatas.

        Args:
            text: el texto a clasificar (ej. una pregunta)
            candidate_labels: lista de categorías posibles

        Returns:
            ClassificationResult con la categoría ganadora, su score, y todos los scores.

        TODO:
        - Llamar a self.pipeline(text, candidate_labels=candidate_labels)
        - El resultado del pipeline tiene:
            result["labels"]  → lista de categorías ordenadas por score (desc)
            result["scores"]  → lista de scores correspondientes
        - Construir y retornar un ClassificationResult con:
            category_name = result["labels"][0]  (la de mayor score)
            confidence_score = result["scores"][0]
            all_scores = dict(zip(result["labels"], result["scores"]))
        """
        # TODO: Implementar
        pass

    def classify_batch(self, texts: list[str], candidate_labels: list[str]) -> list[ClassificationResult]:
        """
        Clasifica múltiples textos contra las mismas categorías candidatas.

        Args:
            texts: lista de textos a clasificar
            candidate_labels: lista de categorías posibles

        Returns:
            Lista de ClassificationResult, uno por cada texto.

        TODO:
        - Iterar sobre cada texto y llamar a self.classify()
        - Retornar la lista de resultados
        - (Bonus) Investigar si el pipeline soporta batching nativo
          pasando una lista de textos directamente
        """
        # TODO: Implementar
        pass
```

---

## Paso 5: Implementar la interacción humana (Human-in-the-Loop)

### `app/human_review.py`

```python
"""
Módulo de revisión humana por consola.

Cuando la IA no tiene suficiente confianza (score < threshold),
este módulo le pregunta al usuario por terminal qué categoría corresponde.

TAREA: Implementar las funciones de interacción por consola.
"""


def display_question_context(question_text: str, ai_suggestion: str, confidence: float, all_scores: dict[str, float]) -> None:
    """
    Muestra al usuario la pregunta, la sugerencia de la IA, y los scores.

    Debe imprimir algo como:

    ════════════════════════════════════════════════════════════════
    REVISIÓN MANUAL REQUERIDA (confianza < 70%)
    ════════════════════════════════════════════════════════════════

    Pregunta: ¿Cuál es la velocidad de la luz en el vacío?

    Sugerencia de la IA: física (confianza: 65%)

    Scores de todas las categorías:
      1. física         → 65%
      2. astronomía     → 20%
      3. matemáticas    → 10%
      4. historia       → 5%

    ════════════════════════════════════════════════════════════════

    Args:
        question_text: texto de la pregunta
        ai_suggestion: categoría sugerida por la IA
        confidence: score de confianza (0.0 a 1.0)
        all_scores: diccionario {categoría: score}

    TODO:
    - Imprimir el encabezado visual
    - Mostrar la pregunta
    - Mostrar la sugerencia de la IA con su confianza en porcentaje
    - Mostrar los scores de todas las categorías ordenados de mayor a menor
    - Numerar las categorías (1, 2, 3, ...)
    """
    # TODO: Implementar
    pass


def ask_human_for_category(categories: list[dict[str, str]]) -> str | None:
    """
    Le pide al usuario que elija una categoría por consola.

    Debe mostrar las opciones numeradas y esperar input:

    Opciones:
      1. Machine Learning
      2. Historia
      3. Geografía
      ...
      S. Skip (omitir esta pregunta)

    Elegí una opción:

    Args:
        categories: lista de categorías (cada una con "name" y "label")

    Returns:
        El "name" de la categoría elegida, o None si el usuario eligió skip.

    TODO:
    - Mostrar las categorías numeradas usando su "label"
    - Agregar opción "S" para skip
    - Leer input del usuario con input()
    - Validar que la entrada sea un número válido o "S"/"s"
    - Si la entrada es inválida, volver a preguntar (loop)
    - Retornar el "name" de la categoría elegida o None si skip
    """
    # TODO: Implementar
    pass


def confirm_ai_suggestion(ai_suggestion: str, confidence: float) -> bool:
    """
    Pregunta al usuario si acepta la sugerencia de la IA.

    ¿Aceptás la sugerencia "machine_learning" (65%)? [S/n]:

    Args:
        ai_suggestion: categoría sugerida por la IA
        confidence: score de confianza

    Returns:
        True si el usuario acepta, False si no.

    TODO:
    - Mostrar la pregunta de confirmación
    - Leer input del usuario
    - Interpretar respuesta vacía o "S"/"s" como True
    - Interpretar "N"/"n" como False
    """
    # TODO: Implementar
    pass
```

---

## Paso 6: Implementar el orquestador de categorización

### `app/categorize.py`

```python
"""
Script principal de categorización.

Orquesta todo el flujo:
1. Carga las preguntas sin categorizar de la BD
2. Para cada pregunta, la clasifica con la IA
3. Si el score >= threshold → guarda automáticamente
4. Si el score < threshold → pide revisión humana
5. Guarda el resultado en la tabla categorizations

TAREA: Implementar la función principal y las funciones auxiliares.
"""
from tqdm import tqdm


# Umbral de confianza (70%)
CONFIDENCE_THRESHOLD = 0.70


def get_uncategorized_questions(db) -> list:
    """
    Obtiene todas las preguntas que aún no tienen una categorización.

    Args:
        db: sesión de SQLAlchemy

    Returns:
        Lista de objetos Question que no tienen una entrada en la tabla categorizations.

    TODO:
    - Hacer una query que obtenga preguntas cuyo id NO esté en la tabla categorizations
    - Pista: usá .filter(~Question.id.in_(subquery)) o un LEFT JOIN con filtro IS NULL
    - Retornar la lista de preguntas
    """
    # TODO: Implementar
    pass


def save_categorization(db, question_id: int, category_name: str, confidence_score: float, is_automatic: bool) -> None:
    """
    Guarda una categorización en la base de datos.

    Args:
        db: sesión de SQLAlchemy
        question_id: ID de la pregunta categorizada
        category_name: nombre de la categoría asignada
        confidence_score: score de confianza de la IA
        is_automatic: True si fue decisión automática, False si fue humana

    TODO:
    - Crear una instancia de Categorization con los datos recibidos
    - Agregarla a la sesión con db.add()
    - Hacer db.commit()
    - Manejar excepciones con try/except y hacer db.rollback() si falla
    """
    # TODO: Implementar
    pass


def categorize_all(batch_size: int = 32, threshold: float = CONFIDENCE_THRESHOLD) -> None:
    """
    Función principal que ejecuta el flujo completo de categorización.

    Args:
        batch_size: tamaño del lote para procesamiento
        threshold: umbral de confianza para decisión automática

    TODO:
    1. Obtener una sesión de BD (usar SessionLocal o get_db)
    2. Cargar las categorías desde app/categories.py
    3. Instanciar el clasificador (AIClassifier)
    4. Obtener las preguntas sin categorizar
    5. Mostrar resumen inicial:
       - Total de preguntas pendientes
       - Categorías disponibles
       - Umbral de confianza
    6. Iterar sobre las preguntas (usar tqdm para progreso):
       a. Clasificar la pregunta con el clasificador
       b. Si score >= threshold:
          - Guardar como automática
          - Incrementar contador de automáticas
       c. Si score < threshold:
          - Mostrar contexto al humano (display_question_context)
          - Preguntar si acepta la sugerencia (confirm_ai_suggestion)
          - Si acepta → guardar con la sugerencia
          - Si no acepta → pedir categoría manual (ask_human_for_category)
          - Si elige skip → continuar sin guardar
          - Incrementar contador de manuales
    7. Mostrar resumen final:
       - Total procesadas
       - Automáticas vs manuales
       - Skipped
    """
    # TODO: Implementar
    pass


if __name__ == "__main__":
    categorize_all()
```

---

## Paso 7: Agregar endpoints a la API

### `app/main.py` — Agregar estos endpoints al archivo existente

```python
# --- Agregar estos endpoints al archivo main.py existente ---


@app.get("/questions/category/{category_name}")
def list_by_category(category_name: str, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """
    Retorna las preguntas que fueron categorizadas con una categoría específica.

    TAREA:
    - Hacer un JOIN entre Question y Categorization
    - Filtrar por Categorization.category_name == category_name
    - Aplicar skip y limit
    - Retornar las preguntas con su información de categorización

    TODO: Implementar la query con JOIN.
    """
    # TODO: Implementar
    pass


@app.get("/categories")
def list_categories():
    """
    Retorna la lista de categorías disponibles.

    TAREA:
    - Importar CATEGORIES desde app/categories.py
    - Retornar la lista completa

    TODO: Implementar.
    """
    # TODO: Implementar
    pass


@app.get("/categories/stats")
def category_stats(db: Session = Depends(get_db)):
    """
    Retorna estadísticas de categorización.

    Debe retornar un JSON como:
    {
        "total_questions": 1000,
        "categorized": 850,
        "uncategorized": 150,
        "automatic": 700,
        "manual": 150,
        "by_category": {
            "machine_learning": 200,
            "historia": 150,
            ...
        }
    }

    TAREA:
    - Contar el total de preguntas
    - Contar las categorizadas (que tienen entrada en categorizations)
    - Contar automáticas vs manuales
    - Agrupar por categoría (GROUP BY)

    TODO: Implementar las queries necesarias.
    Pista: usá db.query(func.count(...)).group_by(...)
    """
    # TODO: Implementar
    pass
```

---

## Paso 8: Correr el sistema completo

### Secuencia de ejecución

```bash
# 1. Asegurarse de que la BD esté corriendo
docker compose up -d

# 2. Crear las tablas nuevas (la tabla categorizations)
poetry run python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"

# 3. Verificar que hay preguntas cargadas
poetry run python -c "from app.database import SessionLocal; from app.models import Question; db = SessionLocal(); print(f'Preguntas: {db.query(Question).count()}')"

# 4. Ejecutar el categorizador
poetry run python app/categorize.py

# 5. Levantar la API para consultar resultados
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Resultado esperado del categorizador

```
Cargando modelo de IA... (puede tardar la primera vez)
Modelo cargado: facebook/bart-large-mnli

═══════════════════════════════════════════
  Categorizador de Preguntas con IA
═══════════════════════════════════════════
  Preguntas pendientes: 1000
  Categorías: 8
  Umbral de confianza: 70%
═══════════════════════════════════════════

Categorizando: 100%|████████████████████| 1000/1000 [15:30<00:00, 1.07it/s]

════════════════════════════════════════════════════════════════
REVISIÓN MANUAL REQUERIDA (confianza < 70%)
════════════════════════════════════════════════════════════════

Pregunta: What is the speed of light in a vacuum?

Sugerencia de la IA: ciencias_naturales (confianza: 62%)

Scores de todas las categorías:
  1. ciencias_naturales  → 62%
  2. física              → 25%
  3. astronomía          → 8%
  4. historia            → 5%

════════════════════════════════════════════════════════════════

Opciones:
  1. Machine Learning
  2. Historia
  3. Ciencias Naturales
  ...
  S. Skip

Elegí una opción: 3

═══════════════════════════════════════════
  RESUMEN DE CATEGORIZACIÓN
═══════════════════════════════════════════
  Total procesadas:    1000
  Automáticas (IA):     850 (85%)
  Manuales (humano):    130 (13%)
  Omitidas (skip):       20 (2%)
═══════════════════════════════════════════
```

---

## Paso 9: Verificar los resultados

### Desde la API

| URL | Qué muestra |
|---|---|
| `http://localhost:8000/categories` | Lista de categorías definidas |
| `http://localhost:8000/categories/stats` | Estadísticas de categorización |
| `http://localhost:8000/questions/category/machine_learning` | Preguntas de ML |
| `http://localhost:8000/questions/category/historia?limit=5` | 5 preguntas de historia |

### Desde Python

```python
import requests

# Ver estadísticas
r = requests.get("http://localhost:8000/categories/stats")
stats = r.json()
print(f"Categorizadas: {stats['categorized']}/{stats['total_questions']}")
print(f"Automáticas: {stats['automatic']}, Manuales: {stats['manual']}")

# Ver preguntas de una categoría
r = requests.get("http://localhost:8000/questions/category/machine_learning", params={"limit": 3})
for q in r.json():
    print(f"  [{q['id']}] {q['question'][:80]}...")
```

---

## Resumen de comandos útiles

| Acción | Comando |
|---|---|
| Iniciar BD | `docker compose up -d` |
| Crear tablas | `poetry run python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"` |
| Categorizar preguntas | `poetry run python app/categorize.py` |
| Iniciar API | `poetry run uvicorn app.main:app --reload` |
| Ver stats por consola | `docker compose exec db psql -U admin -d questions_db -c "SELECT category_name, COUNT(*), ROUND(AVG(confidence_score)::numeric, 2) FROM categorizations GROUP BY category_name ORDER BY count DESC;"` |

---

## Resumen de archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `app/categories.py` | **Crear** | Definición de categorías |
| `app/models.py` | **Modificar** | Agregar modelo `Categorization` |
| `app/classifier.py` | **Crear** | Clasificador con IA |
| `app/human_review.py` | **Crear** | Interacción humana por consola |
| `app/categorize.py` | **Crear** | Script orquestador principal |
| `app/main.py` | **Modificar** | Agregar endpoints de categorías |

---

## Para explorar más

1. Implementá una estrategia alternativa usando **Sentence Transformers + similitud coseno** en vez de zero-shot classification. Compará los resultados.
2. Guardá las decisiones manuales en un archivo CSV y usalo como **dataset de entrenamiento** para fine-tunear un modelo.
3. Agregá un modo `--auto-only` al script que solo categorice las que superan el umbral, sin pedir input humano (útil para correr en batch sin supervisión).
4. Implementá un endpoint `PUT /categorizations/{id}` que permita corregir una categorización existente desde la API.
5. Agregá métricas de **precisión**: después de categorizar todo, revisá manualmente una muestra y calculá qué porcentaje acertó la IA.
6. Experimentá con diferentes modelos (`facebook/bart-large-mnli` vs `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) y compará precisión y velocidad.

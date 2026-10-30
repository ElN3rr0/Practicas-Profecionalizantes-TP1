# CONCEPTS — Categorización de Datos con IA

Este documento resume los conceptos clave que necesitás entender para construir un sistema que categorice preguntas automáticamente usando Inteligencia Artificial. Si la IA no tiene suficiente confianza (< 70%), el sistema le pregunta a un humano por consola — un patrón conocido como **Human-in-the-Loop**.

---

## 1. ¿Qué es Categorización de Texto?

Categorizar texto significa asignar una **etiqueta** (categoría) a un fragmento de texto en función de su contenido. Ejemplo:

| Pregunta | Categoría esperada |
|---|---|
| "¿Qué es el overfitting?" | `machine_learning` |
| "¿Quién pintó la Mona Lisa?" | `historia_del_arte` |
| "¿Cuál es la capital de Japón?" | `geografía` |

Existen dos enfoques principales:

| Enfoque | Descripción | Ejemplo |
|---|---|---|
| **Supervisado** | El modelo aprende de ejemplos etiquetados previamente | Entrenar un clasificador con miles de preguntas ya categorizadas |
| **Zero-shot** | El modelo clasifica sin haber visto ejemplos de esas categorías específicas | Pedirle a un LLM que clasifique usando solo la descripción de las categorías |

En este proyecto usamos **zero-shot classification**, que es más práctico cuando no tenemos un dataset etiquetado grande.

---

## 2. Modelos de Lenguaje y Embeddings

### ¿Qué es un Modelo de Lenguaje (LLM)?

Un modelo de lenguaje es una red neuronal entrenada con enormes cantidades de texto. Aprende patrones estadísticos del lenguaje: qué palabras tienden a aparecer juntas, en qué contextos, etc.

Para categorización podemos usarlos de dos formas:

| Forma | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **Prompt directo** | Le pedís al LLM que clasifique directamente | Simple, flexible | Requiere API externa, más lento, costo por token |
| **Embeddings + similitud** | Convertís texto a vectores y comparás distancias | Rápido, funciona offline | Requiere entender espacios vectoriales |

### ¿Qué es un Embedding?

Un embedding es una **representación numérica** (un vector) de un texto. Textos con significado similar producen vectores cercanos en el espacio.

```
"¿Qué es el overfitting?"  →  [0.23, -0.45, 0.78, ..., 0.12]   (vector de N dimensiones)
"machine_learning"          →  [0.25, -0.41, 0.80, ..., 0.10]   (vector cercano al anterior)
"geografía"                 →  [-0.60, 0.33, -0.15, ..., 0.88]  (vector lejano)
```

### Similitud Coseno

Para medir qué tan parecidos son dos vectores usamos **similitud coseno**. Devuelve un valor entre -1 y 1:

| Valor | Significado |
|---|---|
| ~1.0 | Muy similares |
| ~0.0 | Sin relación |
| ~-1.0 | Opuestos |

```python
from sklearn.metrics.pairwise import cosine_similarity

similitud = cosine_similarity([vector_pregunta], [vector_categoria])
# Ej: 0.85 → alta similitud → probablemente pertenece a esa categoría
```

---

## 3. Hugging Face Transformers y Pipelines

### La librería `transformers`

Hugging Face provee modelos pre-entrenados listos para usar. Para categorización zero-shot usamos el pipeline `zero-shot-classification`:

```python
from transformers import pipeline

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

result = classifier(
    "¿Qué es el gradient descent?",
    candidate_labels=["machine_learning", "historia", "geografía", "biología"]
)

print(result["labels"][0])   # "machine_learning"
print(result["scores"][0])   # 0.92 → 92% de confianza
```

### ¿Cómo funciona zero-shot classification?

El modelo no fue entrenado específicamente en tus categorías. En cambio:

1. Toma la pregunta y cada categoría candidata.
2. Evalúa la **probabilidad** de que la pregunta sea sobre cada categoría.
3. Devuelve las categorías ordenadas por confianza (score).

Es "zero-shot" porque requiere **cero ejemplos de entrenamiento** para tus categorías específicas.

### Pipeline alternativo: Sentence Transformers + Similitud

```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer("all-MiniLM-L6-v2")

# Embeddings de las categorías (se calculan una sola vez)
categorias = ["machine_learning", "historia", "geografía", "biología"]
embeddings_categorias = model.encode(categorias)

# Embedding de la pregunta
pregunta = "¿Qué es el gradient descent?"
embedding_pregunta = model.encode([pregunta])

# Similitud contra cada categoría
similitudes = cosine_similarity(embedding_pregunta, embeddings_categorias)[0]

# Resultado
for cat, score in zip(categorias, similitudes):
    print(f"  {cat}: {score:.2f}")
```

---

## 4. Confianza y Umbral de Decisión

### ¿Qué es un umbral (threshold)?

Es el valor mínimo de confianza que exigimos para aceptar una categorización automática. Si la confianza está por debajo del umbral, consideramos que la IA "no está segura".

```
Score >= 0.70  →  La IA asigna la categoría automáticamente
Score <  0.70  →  Se le pregunta a un humano
```

### ¿Por qué 70%?

No hay un número mágico universal. El umbral depende del contexto:

| Contexto | Umbral típico |
|---|---|
| Diagnóstico médico | 95%+ (errores son costosos) |
| Categorización de preguntas para estudio | 70% (errores son corregibles) |
| Sugerencia de tags en redes sociales | 50% (baja consecuencia) |

En este proyecto usamos 70% como balance entre automatización y precisión.

### Calibración de Confianza

Un score de 0.70 **no siempre** significa "70% de probabilidad de estar correcto". Los modelos pueden estar **mal calibrados**: dar scores altos pero equivocarse, o scores bajos y acertar. Es importante evaluar empíricamente qué tan confiable es el score del modelo elegido.

---

## 5. Human-in-the-Loop (HITL)

### El patrón

Cuando la IA no tiene suficiente confianza, delegamos la decisión a un humano. El flujo es:

```
[Pregunta sin categoría]
        ↓
[IA intenta clasificar]
        ↓
  ¿Score >= 70%?
   /          \
  SÍ          NO
  ↓            ↓
[Asignar    [Mostrar pregunta
 categoría   y opciones al
 automática] humano por consola]
                ↓
            [Humano elige]
                ↓
            [Guardar decisión]
```

### ¿Por qué es importante?

- **En la industria**: sistemas como el etiquetado de imágenes médicas, moderación de contenido, y vehículos autónomos usan HITL cuando la IA no tiene certeza.
- **En datos**: las decisiones humanas se pueden usar como **nuevos ejemplos de entrenamiento** para mejorar el modelo en el futuro (Active Learning).
- **En este proyecto**: mantiene la calidad de los datos mientras automatiza la mayoría del trabajo.

### Interacción por consola (CLI)

En Python, `input()` permite pedir datos al usuario por terminal:

```python
print(f"\nPregunta: {pregunta}")
print(f"La IA sugiere: {categoria_sugerida} (confianza: {score:.0%})")
print("Categorías disponibles:")
for i, cat in enumerate(categorias, 1):
    print(f"  {i}. {cat}")

eleccion = input("Elegí el número de categoría (o 'skip' para omitir): ")
```

---

## 6. Persistencia de Resultados

### ¿Dónde guardar las categorizaciones?

Las categorías asignadas (tanto automáticas como manuales) deben persistirse. Opciones:

| Opción | Ventajas | Desventajas |
|---|---|---|
| Actualizar la columna `category` en la BD existente | Simple, todo en un lugar | Pisás datos originales |
| Nueva tabla `categorizations` con FK a `questions` | Trazabilidad, historial | Más complejidad |
| Archivo JSON/CSV local | Rápido para prototipos | No escala, sin integridad referencial |

En este proyecto creamos una **nueva tabla** que registra:
- Qué pregunta se categorizó
- Qué categoría se asignó
- Si la decisión fue automática o manual
- El score de confianza de la IA
- Timestamp de cuándo se hizo

Esto permite auditar y mejorar el modelo a futuro.

---

## 7. Procesamiento por Lotes (Batch Processing)

### ¿Por qué no una pregunta a la vez?

Procesar las preguntas de a una es ineficiente. El procesamiento por lotes:
- **Reduce overhead**: una sola carga del modelo, múltiples predicciones.
- **Permite progreso visible**: mostrás una barra de progreso o porcentaje.
- **Facilita la reanudación**: si el proceso se interrumpe, retomás desde el último lote completado.

```python
from tqdm import tqdm

preguntas = obtener_preguntas_sin_categoria(db)
batch_size = 32

for i in tqdm(range(0, len(preguntas), batch_size), desc="Categorizando"):
    batch = preguntas[i:i + batch_size]
    # procesar batch...
```

### `tqdm`: Barras de progreso

`tqdm` envuelve un iterable y muestra una barra de progreso en la consola:

```
Categorizando: 45%|████████████░░░░░░░░░░░░| 450/1000 [02:15<02:45, 3.33it/s]
```

No afecta la lógica, solo mejora la experiencia del operador.

---

## Flujo General del Sistema

```
[Preguntas sin categoría en PostgreSQL]
                ↓
[Script de categorización]
                ↓
    ┌───────────────────────────┐
    │  Para cada pregunta:      │
    │  1. Generar embedding /   │
    │     clasificar con LLM    │
    │  2. ¿Score >= 0.70?       │
    │     SÍ → guardar auto     │
    │     NO → preguntar humano │
    │  3. Guardar resultado     │
    │     en tabla              │
    │     categorizations       │
    └───────────────────────────┘
                ↓
[Todas las preguntas categorizadas]
                ↓
[Nuevo endpoint GET /questions/category/{cat}]
                ↓
[API lista para consultar por categoría]
```

---

## Recursos para practicar

1. **Hugging Face Zero-Shot**: https://huggingface.co/tasks/zero-shot-classification
2. **Sentence Transformers**: https://www.sbert.net/
3. **Cosine Similarity explicado**: https://en.wikipedia.org/wiki/Cosine_similarity
4. **Human-in-the-Loop ML**: https://humansintheloop.org/
5. **tqdm**: https://tqdm.github.io/
6. **Active Learning**: https://en.wikipedia.org/wiki/Active_learning_(machine_learning)

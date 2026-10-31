# Sistema bilingüe (inglés / español)

El juego puede mostrar las preguntas y respuestas del dataset en **inglés** (original)
o **español** (traducido). El texto original en inglés nunca se modifica y el
clasificador de categorías sigue trabajando con él.

## Modelo de traducción

- **Modelo:** `Helsinki-NLP/opus-mt-en-es` (MarianMT) vía `transformers`.
- **Por qué este y no Argos Translate:** Argos es más liviano en inferencia, pero su
  árbol de dependencias (`spacy`, `stanza`, `ctranslate2`, `cymem`) exige compilar
  extensiones nativas con MSVC, y con Python 3.14 + Poetry la instalación falla.
  El proyecto **ya usa `transformers` + `torch`** para el clasificador, así que
  MarianMT se integra con el mismo stack, sin compilación nativa y 100 % offline.
- **Ubicación local del modelo:** `full-app-ai-scenario/models/hf-cache/` (≈600 MB).
  Se descarga una sola vez; después la traducción corre sin red. Esta carpeta está en
  `.gitignore` (no se versiona).
- **Identificador de versión:** cada fila de `translations` guarda `model_version`
  para saber con qué modelo se generó.

## Almacenamiento

Tabla independiente `translations` (en `app/models.py`):

| columna | contenido |
|---|---|
| `question_id` | FK a `questions.id` |
| `lang` | `es` (idioma destino) |
| `question_text` | pregunta traducida |
| `answer_text` | respuesta traducida |
| `model_version` | modelo usado |
| `created_at` | fecha de creación |

`(question_id, lang)` es único → una traducción por pregunta e idioma. Es una caché
persistente: no se vuelve a traducir lo ya guardado.

## API

Los endpoints aceptan `?lang=en|es` (por defecto `en`):

- `GET /questions/category/{category}?lang=es`
- `GET /questions/{id}?lang=es`

Si una traducción no existe, se devuelve el original en inglés (fallback) y la
traducción se genera y guarda en segundo plano para la próxima consulta.

## Comandos

```bash
cd full-app-ai-scenario

# Cuántas preguntas faltan traducir
poetry run python -m app.translate_dataset --pending-count

# Traducir todo el dataset (reanudable; tarda un rato)
poetry run python -m app.translate_dataset

# Traducir solo las primeras N (útil para probar rápido)
poetry run python -m app.translate_dataset --limit 200 --batch-size 16
```

La primera corrida descarga el modelo a `models/hf-cache` (requiere red una vez).

## Frontend

- Selector **English / Español** en la pantalla de Usuarios, integrado al panel de
  configuración.
- El idioma se guarda en `localStorage` (`aver-si-sabes:language`) y se respeta al
  iniciar una nueva partida.
- La pantalla de Pregunta envía `lang` al pedir las preguntas, así que preguntas,
  respuestas y opciones salen en el idioma elegido.

## Limitaciones conocidas

- La calidad es buena pero no perfecta con nombres propios o términos históricos
  (p. ej. "The New Kingdom" → "El Nuevo Reino"). Se puede corregir a mano en la
  tabla `translations` sin tocar el original.
- Traducir las ~33.5k preguntas del dataset completo tarda bastante (minutos/horas
  según CPU). Mientras tanto, las que falten usan el original en inglés.

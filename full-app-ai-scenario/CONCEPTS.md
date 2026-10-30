# CONCEPTS

Este documento resume los conceptos clave que necesitás entender para encarar y completar el proyecto. No es un tutorial paso a paso, sino una guía de estudio orientada a los temas que se evalúan en la materia.

---

## 1. Python (Nivel Intermedio)

El proyecto usa Python de forma intensiva. Estos son los tres conceptos que tenés que dominar:

### Type Hints (Anotaciones de Tipo)

FastAPI aprovecha los type hints para validar datos automáticamente y generar documentación.

```python
def obtener_pregunta(pregunta_id: int, skip: int = 0) -> dict:
    ...
```

- `pregunta_id: int` le dice a Python/FastAPI que espera un entero.
- `-> dict` indica el tipo de retorno.
- FastAPI usa esto para rechazar automáticamente datos inválidos (ej. un string donde espera un int).

### Decoradores (`@`)

Un decorador envuelve una función para extender su comportamiento sin modificar su código.

```python
@app.get("/preguntas")
def listar_preguntas():
    return ...
```

`@app.get("/preguntas")` registra la función `listar_preguntas` para que FastAPI la ejecute cuando alguien haga un GET a esa ruta. El decorador es solo azúcar sintáctica; por detrás hace `app.get("/preguntas")(listar_preguntas)`.

### Generadores y `yield`

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- `yield` pausa la función y devuelve un valor, pero mantiene el estado para poder reanudarla después.
- FastAPI inyecta la sesión de base de datos en la ruta, y cuando la ruta termina, el `finally` se ejecuta cerrando la conexión automáticamente.
- Es la forma segura de manejar recursos (base de datos, archivos, etc.) en FastAPI.

---

## 2. Gestión de Entornos (Poetry)

### ¿Por qué no instalar paquetes globalmente?

Cada proyecto necesita sus propias versiones de librerías. Si instalás todo globalmente, dos proyectos pueden requerir versiones distintas de una misma librería y generar conflictos. Poetry crea un **entorno virtual** aislado por proyecto.

### pyproject.toml vs requirements.txt

- **requirements.txt**: lista plana de dependencias. Funciona, pero es rudimentario.
- **pyproject.toml**: archivo estándar moderno que separa dependencias de producción, desarrollo, y bloquea versiones exactas en `poetry.lock`. Garantiza que todos los integrantes del equipo tengan exactamente las mismas versiones.

Comandos básicos:

| Comando | Qué hace |
|---|---|
| `poetry init` | Crea un nuevo proyecto |
| `poetry add fastapi` | Agrega una dependencia |
| `poetry shell` | Activa el entorno virtual |
| `poetry run python app.py` | Ejecuta sin activar el entorno |
| `poetry export -f requirements.txt --output requirements.txt` | Genera requirements.txt si hace falta |

---

## 3. Contenedores (Docker & Docker Compose)

### Imagen vs Contenedor

| Concepto | Analogía |
|---|---|
| **Imagen** | La receta / el plano / el ISO |
| **Contenedor** | La "cocina viva" ejecutándose |

Una imagen es estática (ej. `postgres:15`). Un contenedor es una instancia en ejecución de esa imagen. Podés tener múltiples contenedores de la misma imagen.

### Mapeo de Puertos (`ports: "5432:5432"`)

```
5432:5432
 ↑      ↑
 Host  Contenedor
```

El primer número es el puerto en tu máquina física; el segundo es el puerto dentro del contenedor. Si cambiás el primero a `15432:5432`, accederías a la base de datos desde tu máquina en `localhost:15432`.

### Volúmenes (`volumes`)

Los contenedores son efímeros: si los borrás, perdés los datos. Los volúmenes son carpetas gestionadas por Docker que persisten independientemente del ciclo de vida del contenedor.

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

---

## 4. Bases de Datos y ORMs (SQLAlchemy)

### Conceptos Básicos de BD Relacionales

- **Tabla**: equivalente a una hoja de Excel o una entidad (ej. `questions`).
- **Columna**: un campo o atributo (`id`, `text`, `category`).
- **Fila**: un registro individual.
- **Primary Key**: columna (o combinación) que identifica únicamente cada fila. Generalmente un `id` autoincremental.

### ¿Qué es un ORM?

**ORM = Object-Relational Mapping**. Traduce tablas SQL a clases de Python y filas a objetos.

| Sin ORM (SQL crudo) | Con ORM (SQLAlchemy) |
|---|---|
| `SELECT * FROM questions WHERE id = 1` | `db.query(Question).filter(Question.id == 1).first()` |
| `INSERT INTO questions (text) VALUES ('...')` | `db.add(Question(text='...'))` |

Ventajas:
- Escribís Python, no SQL (menos errores de sintaxis).
- El ORM previene **SQL Injection** automáticamente.
- Cambiás de base de datos (SQLite → PostgreSQL) sin reescribir consultas.

---

## 5. Manipulación de Datos (Pandas)

### DataFrame

Un DataFrame es una tabla en memoria RAM, como una planilla de Excel pero mucho más rápida. Ofrece operaciones vectorizadas (operan sobre todo el conjunto a la vez, no fila por fila).

Operaciones comunes que vas a usar:

```python
import pandas as pd

df = pd.read_parquet("archivo.parquet")
df.head()              # primeras 5 filas
df.info()              # tipos de datos y nulos
df["categoria"].value_counts()  # frecuencia por categoría
df_filtrado = df[df["categoria"] == "machine_learning"]
```

### Archivos Parquet

| Formato | Cómo almacena | Velocidad | Tamaño |
|---|---|---|---|
| CSV | Fila por fila (texto) | Lento | Grande |
| Parquet | Columnar (binario comprimido) | Mucho más rápido | Hasta 10x más chico |

Hugging Face usa Parquet porque podés leer columnas específicas sin cargar el archivo entero. Ejemplo:

```python
df = pd.read_parquet("datos.parquet", columns=["pregunta", "respuesta"])
```

---

## 6. APIs RESTful (FastAPI)

### Arquitectura Cliente-Servidor

- **Servidor**: tu API hecha con FastAPI. Escucha en un puerto (ej. `localhost:8000`) y responde peticiones.
- **Cliente**: el navegador, Postman, o un script Python que hace requests HTTP.

El servidor **nunca inicia** la comunicación; siempre espera pasivamente.

### Verbos HTTP

| Verbo | Operación | Ejemplo |
|---|---|---|
| `GET` | Obtener / Leer | `GET /preguntas` → lista de preguntas |
| `POST` | Crear | `POST /preguntas` → crea una nueva |
| `PUT` | Reemplazar | `PUT /preguntas/1` → actualiza toda la pregunta 1 |
| `DELETE` | Borrar | `DELETE /preguntas/1` → elimina la pregunta 1 |

En este proyecto usamos principalmente **GET**.

### JSON

JSON es el formato de intercambio universal. Se parece a un diccionario de Python:

```json
{
  "id": 1,
  "texto": "¿Qué es overfitting?",
  "categoria": "machine_learning"
}
```

FastAPI convierte automáticamente tus diccionarios/objetos Python a JSON antes de enviar la respuesta, y viceversa cuando recibe datos del cliente.

---

## Flujo General del Proyecto

```
[Datos en Hugging Face (Parquet)]
          ↓
[Script: leer Parquet con Pandas]
          ↓
[Script: insertar datos en PostgreSQL via SQLAlchemy]
          ↓
[FastAPI: endpoints GET que consultan la BD]
          ↓
[Cliente (navegador / script) recibe JSON]
```

Cada etapa del pipeline usa uno de los conceptos de arriba. Si entendés cada pieza por separado, el proyecto completo se vuelve mucho más manejable.

---

## Recursos para practicar

1. **Type Hints**: https://docs.python.org/3/library/typing.html
2. **FastAPI tutorial oficial**: https://fastapi.tiangolo.com/tutorial/
3. **Poetry**: https://python-poetry.org/docs/
4. **Docker getting started**: https://docs.docker.com/get-started/
5. **SQLAlchemy ORM**: https://docs.sqlalchemy.org/en/20/orm/
6. **Pandas 10 min**: https://pandas.pydata.org/docs/user_guide/10min.html
7. **Parquet**: https://parquet.apache.org/

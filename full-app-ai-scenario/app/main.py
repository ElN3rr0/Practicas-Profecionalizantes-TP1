from fastapi import BackgroundTasks, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.categories import CATEGORIES
from app.database import SessionLocal, engine, get_db
from app.models import Base, Categorization, Question, Translation
from app.translation import SUPPORTED_LANGUAGES, get_or_create_translation
from pydantic import BaseModel

class QuestionCreate(BaseModel):
    question: str
    answer: str
    category: str | None = None
    source: str | None = None

class CategorizationUpdate(BaseModel):
    category_name: str

app = FastAPI(title="Questions API", version="1.0.0")

# The web game runs on a different origin (e.g. the Vite dev server on :5173),
# so the browser needs CORS headers to read these responses. The API has no
# credentials, so any local origin is allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _normalized_lang(lang: str) -> str:
    """Only 'en' and 'es' are supported; anything else falls back to 'en'."""
    return lang if lang in SUPPORTED_LANGUAGES else "en"


def _translation_map(db: Session, question_ids: list[int], lang: str) -> dict[int, Translation]:
    """Look up the stored translations for a batch of question ids in one query."""
    if lang == "en" or not question_ids:
        return {}
    rows = (
        db.query(Translation)
        .filter(Translation.lang == lang, Translation.question_id.in_(question_ids))
        .all()
    )
    return {row.question_id: row for row in rows}


def _translate_missing(question_ids: list[int], lang: str) -> None:
    """Background task: translate and store the questions that had no translation yet."""
    if lang == "en" or not question_ids:
        return
    db = SessionLocal()
    try:
        questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
        for question in questions:
            get_or_create_translation(db, question, lang)
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Questions API funcionando", "endpoints": ["/questions", "/questions/{id}"]}

@app.get("/questions")
def list_questions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    questions = db.query(Question).offset(skip).limit(limit).all()
    return questions

@app.get("/questions/{question_id}")
def get_question(
    question_id: int,
    background_tasks: BackgroundTasks,
    lang: str = "en",
    db: Session = Depends(get_db),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return {"error": "Pregunta no encontrada"}

    lang = _normalized_lang(lang)
    translation = _translation_map(db, [question.id], lang).get(question.id)
    if translation is None:
        if lang != "en":
            background_tasks.add_task(_translate_missing, [question.id], lang)
        return {
            "id": question.id,
            "question": question.question,
            "answer": question.answer,
            "category": question.category,
            "source": question.source,
            "lang": lang,
        }
    return {
        "id": question.id,
        "question": translation.question_text,
        "answer": translation.answer_text,
        "category": question.category,
        "source": question.source,
        "lang": lang,
    }


# --- Reemplaza al viejo get_questions_by_category ---
@app.get("/questions/category/{category_name}")
def list_by_category(
    category_name: str,
    background_tasks: BackgroundTasks,
    skip: int = 0,
    limit: int = 10,
    lang: str = "en",
    random: bool = False,
    db: Session = Depends(get_db),
):
    lang = _normalized_lang(lang)
    query = (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .filter(Categorization.category_name == category_name)
    )
    # Random mode is the game's question draw: the whole category is a candidate,
    # not just the first page. Stable order keeps plain pagination predictable.
    query = query.order_by(func.random()) if random else query.order_by(Question.id)
    results = query.offset(skip).limit(limit).all()

    if not results:
        return []

    ids = [question.id for question, _ in results]
    translations = _translation_map(db, ids, lang)
    missing = [question_id for question_id in ids if question_id not in translations]
    if missing:
        # The response falls back to English now; the translation lands next time.
        background_tasks.add_task(_translate_missing, missing, lang)

    response = []
    for question, categorization in results:
        translation = translations.get(question.id)
        response.append({
            "id": question.id,
            "question": translation.question_text if translation else question.question,
            "answer": translation.answer_text if translation else question.answer,
            "source": question.source,
            "category_name": categorization.category_name,
            "confidence_score": categorization.confidence_score,
            "is_automatic": categorization.is_automatic,
            "lang": lang,
        })
    return response


@app.get("/categories")
def list_categories():
    return CATEGORIES


@app.get("/categories/stats")
def category_stats(db: Session = Depends(get_db)):
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


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Question).count()
    category_counts = db.query(
        Question.category,
        func.count(Question.id)
    ).group_by(Question.category).all()

    stats_list = []
    for cat, count in category_counts:
        stats_list.append({
            "category": cat if cat else "Sin categoría",
            "total": count
        })

    return {
        "total_questions": total,
        "categories_breakdown": stats_list
    }

@app.put("/categorizations/{categorization_id}")
def update_categorization(categorization_id: int, data: CategorizationUpdate, db: Session = Depends(get_db)):
    categorization = db.query(Categorization).filter(Categorization.id == categorization_id).first()
    if not categorization:
        return {"error": "Categorización no encontrada"}

    # Validamos que la categoría nueva exista en nuestra lista de categorías válidas
    nombres_validos = [c["name"] for c in CATEGORIES]
    if data.category_name not in nombres_validos:
        return {"error": f"Categoría inválida: '{data.category_name}'. Válidas: {nombres_validos}"}

    categorization.category_name = data.category_name
    categorization.is_automatic = False  # si un humano la corrige a mano, deja de ser automática

    db.commit()
    db.refresh(categorization)

    return {
        "id": categorization.id,
        "question_id": categorization.question_id,
        "category_name": categorization.category_name,
        "confidence_score": categorization.confidence_score,
        "is_automatic": categorization.is_automatic,
    }

@app.post("/questions")
def create_question(q_data: QuestionCreate, db: Session = Depends(get_db)):
    new_q = Question(
        question=q_data.question,
        answer=q_data.answer,
        category=q_data.category,
        source=q_data.source
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q

@app.put("/questions/{question_id}")
def update_question(question_id: int, q_data: QuestionCreate, db: Session = Depends(get_db)):
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        return {"error": "Pregunta no encontrada"}

    db_question.question = q_data.question
    db_question.answer = q_data.answer
    db_question.category = q_data.category
    db_question.source = q_data.source

    db.commit()
    db.refresh(db_question)
    return db_question

@app.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        return {"error": "Pregunta no encontrada"}

    db.delete(db_question)
    db.commit()
    return {"message": f"Pregunta {question_id} eliminada correctamente"}
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
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
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return {"error": "Pregunta no encontrada"}
    return question


# --- Reemplaza al viejo get_questions_by_category ---
@app.get("/questions/category/{category_name}")
def list_by_category(category_name: str, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
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
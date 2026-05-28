from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import Base, Question


class QuestionCreate(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    category: str | None = None
    source: str | None = None


class QuestionUpdate(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    category: str | None = None
    source: str | None = None

app = FastAPI(title="Questions API", version="1.0.0")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "Questions API funcionando",
        "endpoints": [
            "/questions",
            "POST /questions",
            "PUT /questions/{id}",
            "DELETE /questions/{id}",
            "/questions/{id}",
            "/questions/category/{category}",
            "/stats",
        ],
    }


@app.get("/questions")
def list_questions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    questions = db.query(Question).offset(skip).limit(limit).all()
    return questions


@app.post("/questions", status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    question = Question(
        question=payload.question,
        answer=payload.answer,
        category=payload.category,
        source=payload.source,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@app.put("/questions/{question_id}")
def update_question(
    question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    question.question = payload.question
    question.answer = payload.answer
    question.category = payload.category
    question.source = payload.source

    db.commit()
    db.refresh(question)
    return question


@app.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    db.delete(question)
    db.commit()
    return {"message": "Pregunta eliminada"}


@app.get("/questions/category/{category}")
def list_questions_by_category(
    category: str,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    questions = (
        db.query(Question)
        .filter(Question.category == category)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return questions


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Question.id)).scalar()
    rows = (
        db.query(Question.category, func.count(Question.id))
        .group_by(Question.category)
        .all()
    )
    return {
        "total": total,
        "by_category": {
            (cat if cat is not None else "sin_categoria"): count for cat, count in rows
        },
    }


@app.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    return question
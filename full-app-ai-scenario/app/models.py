from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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


class Translation(Base):
    """Traducción de una pregunta y su respuesta a otro idioma.

    Se guarda en una tabla aparte para no tocar los textos originales en inglés.
    `(question_id, lang)` es único: una fila por pregunta por idioma, lo que actúa
    como caché persistente y evita volver a traducir el mismo contenido.
    """

    __tablename__ = "translations"
    __table_args__ = (
        UniqueConstraint("question_id", "lang", name="uq_translations_question_lang"),
    )

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    lang = Column(String(10), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=False)
    model_version = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    source_question = relationship("Question", backref="translations")
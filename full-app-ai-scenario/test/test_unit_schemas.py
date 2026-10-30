import pytest
from pydantic import ValidationError

from app.main import QuestionCreate


class TestQuestionCreateSchema:

    def test_accepts_valid_payload(self):
        data = QuestionCreate(
            question="¿Qué es un ORM?",
            answer="Object-Relational Mapping",
            category="tecnologia",
        )
        assert data.question == "¿Qué es un ORM?"
        assert data.answer == "Object-Relational Mapping"

    def test_category_and_source_son_opcionales(self):
        data = QuestionCreate(question="¿2+2?", answer="4")
        assert data.category is None
        assert data.source is None

    def test_rechaza_si_falta_un_campo_obligatorio(self):
        with pytest.raises(ValidationError):
            QuestionCreate(answer="Falta la pregunta")

    def test_rechaza_tipo_de_dato_incorrecto(self):
        with pytest.raises(ValidationError):
            QuestionCreate(question="¿Cuántos son?", answer=123456)
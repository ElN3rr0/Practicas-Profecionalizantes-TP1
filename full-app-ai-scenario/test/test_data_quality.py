import pandas as pd
import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Question


class TestDataQuality:

    def test_la_db_rechaza_question_o_answer_nulos(self, db_session):
        """Tests de esquema: valores nulos en columnas críticas
        no deberían poder llegar a persistirse."""
        pregunta_invalida = Question(question=None, answer="algo", category="x")
        db_session.add(pregunta_invalida)

        with pytest.raises(IntegrityError):
            db_session.commit()

        db_session.rollback()

    def test_dataframe_de_ejemplo_no_tiene_nulos_en_columnas_criticas(self):
        """Simula un chunk del dataset tal como lo entrega load_data.py
        antes de insertarlo, para detectar el problema ANTES de tocar la DB."""
        muestra = pd.DataFrame({
            "question": ["¿Q1?", "¿Q2?"],
            "answer": ["A1", "A2"],
            "category": ["historia", None],
        })

        assert muestra["question"].notnull().all()
        assert muestra["answer"].notnull().all()
        # category sí puede ser nula (nullable=True en el modelo), no la exigimos

    def test_columna_category_tiene_el_tipo_esperado(self):
        """Tests de distribución/tipo: si category viene, tiene que ser texto."""
        muestra = pd.DataFrame({"category": ["historia", "ciencia", None]})
        valores_no_nulos = muestra["category"].dropna()
        assert valores_no_nulos.apply(lambda x: isinstance(x, str)).all()
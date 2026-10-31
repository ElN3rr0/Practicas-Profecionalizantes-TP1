"""Tests del sistema bilingüe: tabla de traducciones, endpoints y caché."""

from unittest.mock import patch

from app.models import Categorization, Question, Translation
from app.translation import count_pending, get_or_create_translation, translate_text


def _english_question(db_session) -> Question:
    question = Question(
        question="What is the capital of France?",
        answer="Paris",
        category="geografia",
        source="Test de traducción",
    )
    db_session.add(question)
    db_session.commit()
    db_session.refresh(question)
    return question


def _store_translation(db_session, question: Question) -> Translation:
    translation = Translation(
        question_id=question.id,
        lang="es",
        question_text="¿Cuál es la capital de Francia?",
        answer_text="París",
        model_version="test-model",
    )
    db_session.add(translation)
    db_session.commit()
    return translation


class TestTranslationEndpoints:
    def test_single_question_returns_spanish_translation(self, client, db_session):
        question = _english_question(db_session)
        _store_translation(db_session, question)

        data = client.get(f"/questions/{question.id}?lang=es").json()

        assert data["question"] == "¿Cuál es la capital de Francia?"
        assert data["answer"] == "París"
        assert data["lang"] == "es"

    def test_single_question_returns_original_in_english(self, client, db_session):
        question = _english_question(db_session)
        _store_translation(db_session, question)

        data = client.get(f"/questions/{question.id}?lang=en").json()

        assert data["question"] == "What is the capital of France?"
        assert data["answer"] == "Paris"
        assert data["lang"] == "en"

    @patch("app.main._translate_missing")
    def test_single_question_falls_back_to_original(self, _background, client, db_session):
        question = _english_question(db_session)

        data = client.get(f"/questions/{question.id}?lang=es").json()

        # Sin traducción guardada se usa el original y la partida sigue funcionando.
        assert data["question"] == "What is the capital of France?"
        assert data["answer"] == "Paris"

    @patch("app.main._translate_missing")
    def test_category_endpoint_serves_translations(self, _background, client, db_session):
        question = _english_question(db_session)
        db_session.add(
            Categorization(
                question_id=question.id,
                category_name="geografia",
                confidence_score=0.9,
                is_automatic=True,
            )
        )
        db_session.commit()
        _store_translation(db_session, question)

        data = client.get("/questions/category/geografia?lang=es").json()

        assert len(data) == 1
        assert data[0]["question"] == "¿Cuál es la capital de Francia?"
        assert data[0]["answer"] == "París"
        assert data[0]["lang"] == "es"

    def test_unsupported_language_falls_back_to_english(self, client, db_session):
        question = _english_question(db_session)
        _store_translation(db_session, question)

        data = client.get(f"/questions/{question.id}?lang=fr").json()

        assert data["lang"] == "en"
        assert data["question"] == "What is the capital of France?"


class TestTranslationCache:
    def test_get_or_create_reuses_the_stored_translation(self, db_session):
        question = _english_question(db_session)

        with patch(
            "app.translation.translate_text", side_effect=["Hola", "Mundo"]
        ) as translate_mock:
            first = get_or_create_translation(db_session, question, "es")
            second = get_or_create_translation(db_session, question, "es")

        assert first.id == second.id
        assert translate_mock.call_count == 2  # pregunta + respuesta, una sola vez
        assert db_session.query(Translation).count() == 1

    def test_translation_does_not_modify_the_original_question(self, db_session):
        question = _english_question(db_session)

        with patch("app.translation.translate_text", side_effect=["Hola", "Mundo"]):
            get_or_create_translation(db_session, question, "es")

        db_session.refresh(question)
        assert question.question == "What is the capital of France?"
        assert question.answer == "Paris"

    def test_count_pending_tracks_untranslated_questions(self, db_session):
        translated = _english_question(db_session)
        _store_translation(db_session, translated)
        _english_question(db_session)

        assert count_pending(db_session, "es") == 1


class TestOfflineTranslator:
    def test_translates_english_to_spanish_offline(self):
        result = translate_text("What is the capital of France?")

        assert result != "What is the capital of France?"
        assert "Francia" in result

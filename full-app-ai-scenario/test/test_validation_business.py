from app.models import Question, Categorization


class TestBusinessRulesValidation:

    def test_filtro_por_categoria_no_trae_otras_categorias(self, client, db_session):
        p1 = Question(question="p1", answer="a1")
        p2 = Question(question="p2", answer="a2")
        db_session.add_all([p1, p2])
        db_session.commit()
        db_session.refresh(p1)
        db_session.refresh(p2)

        db_session.add_all([
            Categorization(question_id=p1.id, category_name="historia", confidence_score=0.9, is_automatic=True),
            Categorization(question_id=p2.id, category_name="ciencia", confidence_score=0.9, is_automatic=True),
        ])
        db_session.commit()

        resp = client.get("/questions/category/historia")
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert all(q["category_name"] == "historia" for q in results)

    def test_modo_random_dibuja_solo_de_la_categoria_y_respeta_el_limite(self, client, db_session):
        questions = [Question(question=f"historia {index}", answer=f"a{index}") for index in range(5)]
        db_session.add_all(questions)
        db_session.commit()
        for question in questions:
            db_session.refresh(question)
            db_session.add(
                Categorization(
                    question_id=question.id,
                    category_name="historia",
                    confidence_score=0.9,
                    is_automatic=True,
                )
            )
        other = Question(question="ciencia", answer="otra")
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        db_session.add(
            Categorization(
                question_id=other.id,
                category_name="ciencia",
                confidence_score=0.9,
                is_automatic=True,
            )
        )
        db_session.commit()

        resp = client.get("/questions/category/historia?random=true&limit=2")
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 2
        assert all(q["category_name"] == "historia" for q in results)

    def test_stats_total_coincide_con_la_suma_por_categoria(self, client, db_session):
        db_session.add_all([
            Question(question="p1", answer="a1", category="a"),
            Question(question="p2", answer="a2", category="a"),
            Question(question="p3", answer="a3", category="b"),
        ])
        db_session.commit()

        resp = client.get("/stats")
        stats = resp.json()
        suma_por_categoria = sum(item["total"] for item in stats["categories_breakdown"])
        assert stats["total_questions"] == suma_por_categoria == 3

    def test_pregunta_inexistente_informa_error_en_vez_de_inventar_datos(self, client):
        resp = client.get("/questions/999999")
        assert resp.json() == {"error": "Pregunta no encontrada"}
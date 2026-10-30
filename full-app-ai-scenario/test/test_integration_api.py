class TestQuestionsAPIIntegration:

    def test_crear_y_luego_obtener_una_pregunta(self, client):
        payload = {
            "question": "¿Cuál es la capital de Italia?",
            "answer": "Roma",
            "category": "geografia",
            "source": "Test manual",
        }

        create_resp = client.post("/questions", json=payload)
        assert create_resp.status_code == 200
        created = create_resp.json()
        assert created["id"] is not None

        get_resp = client.get(f"/questions/{created['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["question"] == payload["question"]
        assert fetched["answer"] == payload["answer"]

    def test_listar_preguntas_incluye_las_ya_cargadas(self, client, seeded_question):
        resp = client.get("/questions")
        assert resp.status_code == 200
        data = resp.json()
        assert any(q["id"] == seeded_question.id for q in data)

    def test_actualizar_pregunta_persiste_el_cambio(self, client, seeded_question):
        payload = {
            "question": seeded_question.question,
            "answer": "Nueva respuesta actualizada",
            "category": seeded_question.category,
            "source": seeded_question.source,
        }
        resp = client.put(f"/questions/{seeded_question.id}", json=payload)
        assert resp.status_code == 200
        assert resp.json()["answer"] == "Nueva respuesta actualizada"

        # Confirmamos que el cambio quedó realmente guardado en la DB,
        get_resp = client.get(f"/questions/{seeded_question.id}")
        assert get_resp.json()["answer"] == "Nueva respuesta actualizada"

    def test_borrar_pregunta_la_elimina_de_verdad(self, client, seeded_question):
        resp = client.delete(f"/questions/{seeded_question.id}")
        assert resp.status_code == 200

        follow_up = client.get(f"/questions/{seeded_question.id}")
        assert follow_up.json() == {"error": "Pregunta no encontrada"}
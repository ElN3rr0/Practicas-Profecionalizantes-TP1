import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_post_put_delete_question_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_payload = {
            "question": "Pregunta de prueba",
            "answer": "Respuesta inicial",
            "category": "test",
            "source": "pytest",
        }
        create_res = await client.post("/questions", json=create_payload)
        assert create_res.status_code == 201
        created = create_res.json()
        question_id = created["id"]
        assert created["question"] == create_payload["question"]

        update_payload = {
            "question": "Pregunta actualizada",
            "answer": "Respuesta actualizada",
            "category": "actualizada",
            "source": "pytest-httpx",
        }
        update_res = await client.put(f"/questions/{question_id}", json=update_payload)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["question"] == "Pregunta actualizada"
        assert updated["category"] == "actualizada"

        get_res = await client.get(f"/questions/{question_id}")
        assert get_res.status_code == 200
        assert get_res.json()["answer"] == "Respuesta actualizada"

        delete_res = await client.delete(f"/questions/{question_id}")
        assert delete_res.status_code == 200
        assert delete_res.json()["message"] == "Pregunta eliminada"

        missing_res = await client.get(f"/questions/{question_id}")
        assert missing_res.status_code == 404

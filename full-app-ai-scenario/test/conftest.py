import psycopg2
from psycopg2 import errors, sql
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import Question

# Mismas credenciales y puerto que tu docker-compose.yml, pero otra DB.
DB_HOST = "localhost"
DB_PORT = 15432
DB_USER = "admin"
DB_PASSWORD = "admin123"
TEST_DB_NAME = "questions_test_db"

ADMIN_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"
TEST_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{TEST_DB_NAME}"


def _ensure_test_database_exists():
    """Se conecta a la base administrativa 'postgres' (siempre existe) y
    crea 'questions_test_db' si todavia no esta. CREATE DATABASE no puede
    ir dentro de una transaccion normal, por eso usamos autocommit."""
    conn = psycopg2.connect(ADMIN_DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(TEST_DB_NAME))
            )
    except errors.DuplicateDatabase:
        pass  # ya existe de una corrida anterior, no hay problema
    finally:
        conn.close()


_ensure_test_database_exists()

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Reemplazamos la dependencia real (que apunta a questions_db) por la de test
app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="function")
def db_session():
    """Crea las tablas en questions_test_db antes de cada test y las
    borra despues, para que ningun test dependa de datos de otro."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    return TestClient(app)


@pytest.fixture
def seeded_question(db_session):
    """Una pregunta ya cargada en questions_test_db, lista para usar."""
    q = Question(
        question="¿Cuál es la capital de Francia?",
        answer="París",
        category="geografia",
        source="Fixture de test",
    )
    db_session.add(q)
    db_session.commit()
    db_session.refresh(q)
    return q
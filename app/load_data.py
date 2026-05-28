import pandas as pd
import requests
import tempfile
import os
from app.database import SessionLocal, engine
from app.models import Base, Question

DATASET_URL = "https://huggingface.co/datasets/Mdetry/Codigo_Civil_y_Comercial_Argentina-QA/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet"


def clean_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    # Normaliza basura frecuente de parquet mal codificado.
    text = text.replace("\x00", "").replace("\ufffd", "")
    return " ".join(text.split())


def download_parquet(url: str) -> str:
    print(f"Descargando {url}...")
    r = requests.get(url, stream=True)
    r.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".parquet")
    tmp.write(r.content)
    tmp.close()
    return tmp.name


def load_questions():
    Base.metadata.create_all(bind=engine)

    parquet_path = download_parquet(DATASET_URL)
    df = pd.read_parquet(parquet_path)
    os.unlink(parquet_path)

    print(f"Columnas disponibles: {list(df.columns)}")
    print(f"Filas: {len(df)}")
    print(df.head(3))

    session = SessionLocal()
    try:
        existing_pairs = set(session.query(Question.question, Question.answer).all())
        seen_in_batch = set()
        inserted = 0
        skipped_corrupted = 0
        skipped_duplicates = 0

        for _, row in df.iterrows():
            question_text = clean_text(row.get("question", ""))
            answer_text = clean_text(row.get("answer", "") or row.get("answer_alias", ""))
            category_text = clean_text(row.get("category", None)) or None
            source_text = clean_text(row.get("source", None)) or None

            if not question_text or not answer_text:
                skipped_corrupted += 1
                continue

            key = (question_text, answer_text)
            if key in existing_pairs or key in seen_in_batch:
                skipped_duplicates += 1
                continue

            question = Question(
                question=question_text,
                answer=answer_text,
                category=category_text,
                source=source_text,
            )
            session.add(question)
            seen_in_batch.add(key)
            inserted += 1

        session.commit()
        print(f"Se insertaron {inserted} preguntas correctamente.")
        print(f"Filas salteadas por texto vacio/corrupto: {skipped_corrupted}")
        print(f"Filas salteadas por duplicado: {skipped_duplicates}")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    load_questions()
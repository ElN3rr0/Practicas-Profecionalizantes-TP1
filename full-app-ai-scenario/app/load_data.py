import pandas as pd
import requests
import tempfile
import os
from app.database import SessionLocal, engine
from app.models import Base, Question

BASE_URL = "https://huggingface.co/datasets/rlyapin/OpenTriviaQA/resolve/main"

# Mapeo: categoría del profe -> subcarpetas de OpenTriviaQA que la componen
CATEGORY_MAP = {
    "ciencia": ["science-technology"],
    "arte": ["literature", "humanities"],
    "historia": ["history"],
    "entretenimiento": ["entertainment", "movies", "music", "television", "celebrities"],
    "deportes": ["sports"],
    "geografia": ["geography", "world"],
}


def download_parquet(url: str) -> str:
    print(f"  Descargando {url}...")
    r = requests.get(url, stream=True)
    r.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".parquet")
    tmp.write(r.content)
    tmp.close()
    return tmp.name


def load_topic(topic: str) -> pd.DataFrame:
    url = f"{BASE_URL}/{topic}/data.parquet"
    path = download_parquet(url)
    df = pd.read_parquet(path)
    os.unlink(path)
    return df


def load_questions(limit_per_category: int | None = None):
    Base.metadata.create_all(bind=engine)

    all_rows = []
    for category, topics in CATEGORY_MAP.items():
        print(f"Categoría '{category}':")
        dfs = [load_topic(t) for t in topics]
        df_cat = pd.concat(dfs, ignore_index=True)

        if limit_per_category:
            df_cat = df_cat.sample(n=min(limit_per_category, len(df_cat)), random_state=42)

        print(f"  {len(df_cat)} preguntas de {topics}")
        for _, row in df_cat.iterrows():
            all_rows.append({
                "question": row.get("question", ""),
                "answer": row.get("answer", ""),
                "true_category": category,   # la categoría real de origen, no la guardamos en 'category'
                "source": f"OpenTriviaQA - {category}",
            })

    print(f"\nTotal de preguntas a cargar: {len(all_rows)}")

    session = SessionLocal()
    try:
        for row in all_rows:
            question = Question(
                question=row["question"],
                answer=row["answer"],
                category=None,   # queda sin categorizar a propósito, para que la IA la clasifique después
                source=row["source"],
            )
            session.add(question)

        session.commit()
        print(f"Se insertaron {len(all_rows)} preguntas correctamente.")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    load_questions()
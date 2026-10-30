"""
Estrategia alternativa de clasificación: Sentence Transformers + similitud coseno.
Extra "Para explorar más" #1 — para comparar contra zero-shot classification.
"""
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


@dataclass
class ClassificationResult:
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class EmbeddingClassifier:
    """
    Clasificador basado en embeddings semánticos + similitud coseno,
    en vez de zero-shot classification (NLI).
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        print(f"Cargando modelo de embeddings... (puede tardar la primera vez)")
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        print(f"Modelo cargado: {model_name}")

    def classify(self, text: str, candidate_labels: list[str], label_embeddings: np.ndarray | None = None) -> ClassificationResult:
        """
        candidate_labels acá son las DESCRIPCIONES de las categorías (no solo el nombre),
        porque el embedding necesita texto rico en contexto para comparar bien.

        label_embeddings: opcional, para no recalcular los embeddings de las categorías
        en cada llamada (son siempre las mismas, conviene calcularlos una sola vez afuera).
        """
        if label_embeddings is None:
            label_embeddings = self.model.encode(candidate_labels)

        text_embedding = self.model.encode([text])
        similitudes = cosine_similarity(text_embedding, label_embeddings)[0]

        # Normalizamos a 0-1 (la similitud coseno ya está en ese rango para embeddings normalizados,
        # pero por las dudas la recortamos)
        similitudes = np.clip(similitudes, 0, 1)

        indice_ganador = int(np.argmax(similitudes))

        return ClassificationResult(
            category_name=candidate_labels[indice_ganador],
            confidence_score=float(similitudes[indice_ganador]),
            all_scores=dict(zip(candidate_labels, similitudes.tolist())),
        )

    def encode_labels(self, candidate_labels: list[str]) -> np.ndarray:
        """Precalcula los embeddings de las categorías, para reusar en muchas clasificaciones."""
        return self.model.encode(candidate_labels)
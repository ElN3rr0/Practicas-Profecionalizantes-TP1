from dataclasses import dataclass
from transformers import pipeline


@dataclass
class ClassificationResult:
    """
    Resultado de una clasificación.

    Atributos:
        category_name: nombre de la categoría asignada
        confidence_score: score de confianza (0.0 a 1.0)
        all_scores: diccionario con los scores de todas las categorías
    """
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class AIClassifier:
    """
    Clasificador de texto basado en IA.
    Usa el pipeline zero-shot-classification de Hugging Face.
    """

    def __init__(self, model_name: str = "facebook/bart-large-mnli"):
        print(f"Cargando modelo de IA... (puede tardar la primera vez)")
        self.model_name = model_name
        self.pipeline = pipeline("zero-shot-classification", model=model_name)
        print(f"Modelo cargado: {model_name}")

    def classify(self, text: str, candidate_labels: list[str], hypothesis_template: str = "This question is about {}.") -> ClassificationResult:
        result = self.pipeline(text, candidate_labels=candidate_labels, hypothesis_template=hypothesis_template)

        category_name = result["labels"][0]
        confidence_score = result["scores"][0]
        all_scores = dict(zip(result["labels"], result["scores"]))

        return ClassificationResult(
            category_name=category_name,
            confidence_score=confidence_score,
            all_scores=all_scores,
        )

    def classify_batch(self, texts: list[str], candidate_labels: list[str]) -> list[ClassificationResult]:
        results = []
        for text in texts:
            results.append(self.classify(text, candidate_labels))
        return results
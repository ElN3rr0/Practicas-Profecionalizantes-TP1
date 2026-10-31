"""Traducción inicial por lotes de todo el dataset (inglés → español).

Traduce la pregunta y su respuesta de cada fila de `questions` que todavía no
tenga traducción, guardándolas en la tabla `translations` (caché persistente).

Es reanudable: vuelve a ejecutarlo y saltea lo ya traducido.

Uso:
    poetry run python -m app.translate_dataset --pending-count
    poetry run python -m app.translate_dataset --limit 50
    poetry run python -m app.translate_dataset --batch-size 16
"""

from __future__ import annotations

import argparse
import time

from app.database import SessionLocal
from app.translation import count_pending, translate_pending


def main() -> None:
    parser = argparse.ArgumentParser(description="Traduce el dataset al español (offline).")
    parser.add_argument("--limit", type=int, default=None, help="Traducir como máximo N preguntas.")
    parser.add_argument("--batch-size", type=int, default=16, help="Preguntas por lote.")
    parser.add_argument("--lang", default="es", help="Idioma destino (por ahora: es).")
    parser.add_argument(
        "--pending-count",
        action="store_true",
        help="Solo imprimir cuántas preguntas faltan traducir.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.pending_count:
            print(count_pending(db, args.lang))
            return

        pending_before = count_pending(db, args.lang)
        print(f"Preguntas pendientes de traducción: {pending_before}")
        if pending_before == 0:
            print("Nada para traducir.")
            return

        started = time.time()
        translated = translate_pending(
            db, batch_size=args.batch_size, limit=args.limit, lang=args.lang
        )
        elapsed = time.time() - started
        print(f"Traducidas en esta corrida: {translated} ({elapsed:.1f}s)")
        print(f"Pendientes restantes: {count_pending(db, args.lang)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

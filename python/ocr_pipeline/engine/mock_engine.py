from __future__ import annotations

from schemas import CapturedImage, OcrResponse, RecognizedCover


MOCK_CATALOG = [
    {
        "title": "Neverwhere",
        "author": "Neil Gaiman",
        "edition": "BBC Books",
        "genre": "",
        "confidence": "high",
        "raw_text": "Neverwhere Neil Gaiman BBC Books",
    },
    {
        "title": "Kindred",
        "author": "Octavia E. Butler",
        "edition": "Beacon Press",
        "genre": "",
        "confidence": "medium",
        "raw_text": "Kindred Octavia E. Butler Beacon Press",
    },
    {
        "title": "The Left Hand of Darkness",
        "author": "Ursula K. Le Guin",
        "edition": "Ace Books",
        "genre": "",
        "confidence": "medium",
        "raw_text": "The Left Hand of Darkness Ursula K. Le Guin Ace Books",
    },
]


def _seed_from_uri(uri: str) -> int:
    return sum(ord(char) for char in uri)


def _catalog_cover(index: int, source_label: str) -> RecognizedCover:
    item = MOCK_CATALOG[index % len(MOCK_CATALOG)]
    return RecognizedCover(
        title=item["title"],
        author=item["author"],
        edition=item["edition"],
        genre=item["genre"],
        source_label=source_label,
        confidence=item["confidence"],
        raw_text=item["raw_text"],
    )


def run(image: CapturedImage) -> OcrResponse:
    seed = _seed_from_uri(image.uri)
    covers = [
        _catalog_cover(seed, "Cover 1"),
        _catalog_cover(seed + 1, "Cover 2"),
    ]
    return OcrResponse(engine_name="python-mock-cover-engine", covers=covers)

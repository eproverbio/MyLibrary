from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class CapturedImage:
    uri: str
    width: int
    height: int
    format: str
    captured_at: int


@dataclass(slots=True)
class RecognizedCover:
    title: str
    author: str
    edition: str
    genre: str
    source_label: str
    confidence: str
    raw_text: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "author": self.author,
            "edition": self.edition,
            "genre": self.genre,
            "sourceLabel": self.source_label,
            "confidence": self.confidence,
            "rawText": self.raw_text,
        }


@dataclass(slots=True)
class OcrResponse:
    engine_name: str
    covers: list[RecognizedCover]

    def to_dict(self) -> dict[str, Any]:
        return {
            "engineName": self.engine_name,
            "covers": [cover.to_dict() for cover in self.covers],
        }

import type { Book } from "../../types/book";
import type { OcrCandidate, OcrCapturedImage } from "./types";
import { runMockOcrEngine } from "./mockEngine";

function createOcrCandidateId() {
  return `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function extractBooksFromCoverImage(
  image: OcrCapturedImage,
  existingBooks: Book[]
): Promise<OcrCandidate[]> {
  const result = await runMockOcrEngine(image, existingBooks);

  return result.covers.map((cover) => ({
    id: createOcrCandidateId(),
    title: cover.title,
    author: cover.author,
    edition: cover.edition,
    genre: cover.genre,
    sourceLabel: `${cover.sourceLabel} · ${result.engineName}`,
    confidence: cover.confidence,
    rawText: cover.rawText,
    imageUri: image.uri,
    capturedAt: image.capturedAt,
  }));
}

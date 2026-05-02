import type { Book } from "../../types/book";
import { mockOnDeviceOcrProvider } from "./mockOnDeviceProvider";
import { parseCoverText } from "./parser";
import type { OcrCandidate, OcrCapturedImage } from "./types";

function createOcrCandidateId() {
  return `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function extractBooksFromCoverImage(
  image: OcrCapturedImage,
  existingBooks: Book[]
): Promise<OcrCandidate[]> {
  const result = await mockOnDeviceOcrProvider.analyzeCapturedImage(image, existingBooks);

  return result.covers.map((cover) => {
    const parsedFields = parseCoverText(cover);

    return {
      id: createOcrCandidateId(),
      title: parsedFields.title,
      author: parsedFields.author,
      edition: parsedFields.edition,
      genre: parsedFields.genre,
      sourceLabel: `${cover.sourceLabel} - ${result.engineName}`,
      confidence: parsedFields.confidence,
      rawText: parsedFields.rawText,
      imageUri: image.uri,
      capturedAt: image.capturedAt,
      coverBoundingBox: cover.boundingBox,
      recognizedLines: cover.lines,
    };
  });
}

import type { Book } from "../../types/book";
import type { OcrCapturedImage, OcrEngineResult, OcrRecognizedCover } from "./types";

type MockCatalogItem = Omit<OcrRecognizedCover, "sourceLabel">;

const mockCatalog: MockCatalogItem[] = [
  {
    title: "Neverwhere",
    author: "Neil Gaiman",
    edition: "BBC Books",
    genre: "",
    confidence: "high",
    rawText: "Neverwhere Neil Gaiman BBC Books",
  },
  {
    title: "Kindred",
    author: "Octavia E. Butler",
    edition: "Beacon Press",
    genre: "",
    confidence: "medium",
    rawText: "Kindred Octavia E. Butler Beacon Press",
  },
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    edition: "Ace Books",
    genre: "",
    confidence: "medium",
    rawText: "The Left Hand of Darkness Ursula K. Le Guin Ace Books",
  },
];

function getImageSeed(image: OcrCapturedImage) {
  return Array.from(image.uri).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function createMockDuplicate(book: Book, sourceLabel: string): OcrRecognizedCover {
  return {
    title: book.title,
    author: book.author,
    edition: book.edition,
    genre: "",
    sourceLabel,
    confidence: "high",
    rawText: `${book.title} ${book.author} ${book.edition}`.trim(),
  };
}

function createMockCatalogCover(index: number, sourceLabel: string): OcrRecognizedCover {
  const item = mockCatalog[index % mockCatalog.length];

  return {
    ...item,
    sourceLabel,
  };
}

export async function runMockOcrEngine(
  image: OcrCapturedImage,
  books: Book[]
): Promise<OcrEngineResult> {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 900);
  });

  const seed = getImageSeed(image);
  const covers: OcrRecognizedCover[] = [];

  if (books.length > 0) {
    covers.push(createMockDuplicate(books[seed % books.length], "Cover 1"));
  } else {
    covers.push(createMockCatalogCover(seed, "Cover 1"));
  }

  covers.push(createMockCatalogCover(seed + 1, "Cover 2"));

  return {
    engineName: "mock-cover-engine",
    covers,
  };
}

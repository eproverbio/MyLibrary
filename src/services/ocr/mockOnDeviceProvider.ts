import type { Book } from "../../types/book";
import { detectBookBoundingBoxesFromCapturedImage } from "./yolo";
import type {
  OcrCapturedImage,
  OcrDetectedCover,
  OcrEngineResult,
  OcrProvider,
  OcrTextLine,
} from "./types";

type MockCoverSeed = {
  title: string;
  author: string;
  edition: string;
};

const mockCatalog: MockCoverSeed[] = [
  {
    title: "IL NOME DELLA ROSA",
    author: "UMBERTO ECO",
    edition: "Edizione speciale",
  },
  {
    title: "Neverwhere",
    author: "Neil Gaiman",
    edition: "BBC Books",
  },
  {
    title: "Kindred",
    author: "Octavia E. Butler",
    edition: "Beacon Press",
  },
];

function getImageSeed(image: OcrCapturedImage) {
  return Array.from(image.uri).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function createLineId(coverIndex: number, lineIndex: number) {
  return `cover-${coverIndex}-line-${lineIndex}`;
}

function createMockLines(cover: MockCoverSeed, coverIndex: number): OcrTextLine[] {
  return [
    {
      id: createLineId(coverIndex, 0),
      text: cover.author,
      confidence: "high",
      boundingBox: { x: 80, y: 80, width: 260, height: 34 },
    },
    {
      id: createLineId(coverIndex, 1),
      text: cover.title,
      confidence: "high",
      boundingBox: { x: 70, y: 160, width: 340, height: 76 },
    },
    {
      id: createLineId(coverIndex, 2),
      text: cover.edition,
      confidence: "medium",
      boundingBox: { x: 120, y: 620, width: 220, height: 28 },
    },
  ];
}

function createMockDuplicate(book: Book): MockCoverSeed {
  return {
    title: book.title || "Unknown title",
    author: book.author || "Unknown author",
    edition: book.edition || "Unknown edition",
  };
}

function createMockCover(source: MockCoverSeed, coverIndex: number): OcrDetectedCover {
  return {
    id: `cover-${coverIndex}`,
    sourceLabel: `Cover ${coverIndex + 1}`,
    confidence: coverIndex === 0 ? "high" : "medium",
    boundingBox: {
      x: 48 + coverIndex * 24,
      y: 36 + coverIndex * 18,
      width: 420,
      height: 720,
    },
    lines: createMockLines(source, coverIndex),
  };
}

export const mockOnDeviceOcrProvider: OcrProvider = {
  engineName: "mock-android-on-device",
  async analyzeCapturedImage(image: OcrCapturedImage, existingBooks: Book[]): Promise<OcrEngineResult> {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 700);
    });

    const seed = getImageSeed(image);
    const firstCover =
      existingBooks.length > 0
        ? createMockDuplicate(existingBooks[seed % existingBooks.length])
        : mockCatalog[seed % mockCatalog.length];
    const secondCover = mockCatalog[(seed + 1) % mockCatalog.length];
    const detectorResult = await detectBookBoundingBoxesFromCapturedImage(image, {
      allowFallback: true,
    });
    const coverBoxes = detectorResult.detections;

    return {
      engineName: "mock-android-on-device",
      covers:
        coverBoxes.length > 0
          ? [
              {
                ...createMockCover(firstCover, 0),
                boundingBox: {
                  x: coverBoxes[0].x,
                  y: coverBoxes[0].y,
                  width: coverBoxes[0].width,
                  height: coverBoxes[0].height,
                },
              },
              ...(coverBoxes[1]
                ? [
                    {
                      ...createMockCover(secondCover, 1),
                      boundingBox: {
                        x: coverBoxes[1].x,
                        y: coverBoxes[1].y,
                        width: coverBoxes[1].width,
                        height: coverBoxes[1].height,
                      },
                    },
                  ]
                : []),
            ]
          : [createMockCover(firstCover, 0), createMockCover(secondCover, 1)],
    };
  },
};

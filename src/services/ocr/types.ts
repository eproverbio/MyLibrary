import type { Book } from "../../types/book";

export type OcrConfidence = "high" | "medium" | "low";
export type OcrMatchType = "exact" | "title-author" | "none";
export type OcrLineRole = "title" | "author" | "edition" | "publisher" | "other";

export type OcrBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrCapturedImage = {
  uri: string;
  width: number;
  height: number;
  format: "jpg" | "png";
  capturedAt: number;
};

export type OcrTextLine = {
  id: string;
  text: string;
  boundingBox: OcrBoundingBox;
  confidence: OcrConfidence;
};

export type OcrDetectedCover = {
  id: string;
  sourceLabel: string;
  boundingBox: OcrBoundingBox;
  confidence: OcrConfidence;
  lines: OcrTextLine[];
};

export type OcrParsedFields = {
  title: string;
  author: string;
  edition: string;
  genre: string;
  publisher?: string;
  confidence: OcrConfidence;
  rawText?: string;
  assignedRoles: Array<{
    lineId: string;
    role: OcrLineRole;
  }>;
};

export type OcrCandidate = {
  id: string;
  title: string;
  author: string;
  edition: string;
  genre: string;
  sourceLabel: string;
  confidence: OcrConfidence;
  rawText?: string;
  imageUri: string;
  capturedAt: number;
  coverBoundingBox?: OcrBoundingBox;
  recognizedLines: OcrTextLine[];
};

export type OcrVaultMatch = {
  matchType: OcrMatchType;
  matchedBook: Book | null;
};

export type OcrEngineResult = {
  engineName: string;
  covers: OcrDetectedCover[];
};

export type OcrProvider = {
  engineName: string;
  analyzeCapturedImage: (
    image: OcrCapturedImage,
    existingBooks: Book[]
  ) => Promise<OcrEngineResult>;
};

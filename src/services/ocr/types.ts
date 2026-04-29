import type { Book } from "../../types/book";

export type OcrConfidence = "high" | "medium" | "low";
export type OcrMatchType = "exact" | "title-author" | "none";

export type OcrCapturedImage = {
  uri: string;
  width: number;
  height: number;
  format: "jpg" | "png";
  capturedAt: number;
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
};

export type OcrVaultMatch = {
  matchType: OcrMatchType;
  matchedBook: Book | null;
};

export type OcrRecognizedCover = {
  title: string;
  author: string;
  edition: string;
  genre: string;
  sourceLabel: string;
  confidence: OcrConfidence;
  rawText?: string;
};

export type OcrEngineResult = {
  engineName: string;
  covers: OcrRecognizedCover[];
};

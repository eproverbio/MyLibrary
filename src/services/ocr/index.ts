export { resolveOcrVaultMatch } from "./matcher";
export { extractBooksFromCoverImage } from "./pipeline";
export { parseCoverText } from "./parser";
export { mockOnDeviceOcrProvider } from "./mockOnDeviceProvider";
export {
  detectBookBoundingBoxesFromCapturedImage,
  detectBookBoundingBoxesFromImagePath,
} from "./yolo";
export type {
  OcrBoundingBox,
  OcrCandidate,
  OcrCapturedImage,
  OcrConfidence,
  OcrDetectedCover,
  OcrEngineResult,
  OcrLineRole,
  OcrMatchType,
  OcrParsedFields,
  OcrProvider,
  OcrTextLine,
  OcrVaultMatch,
} from "./types";
export type {
  YoloCapturedImageInput,
  YoloDetectFromImagePathInput,
  YoloDetectOptions,
  YoloDetection,
  YoloDetectionResult,
  YoloDetectionSource,
} from "./yolo";

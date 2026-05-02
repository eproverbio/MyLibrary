import type { OcrBoundingBox, OcrCapturedImage } from "../types";

export type YoloDetection = OcrBoundingBox & {
  confidence: number;
  classIndex: number;
  className: string;
};

export type YoloDetectionSource =
  | "tflite-model"
  | "tflite-runtime-unavailable"
  | "model-not-configured"
  | "fallback";

export type YoloDetectionResult = {
  engineName: string;
  source: YoloDetectionSource;
  detections: YoloDetection[];
  modelSummary?: {
    inputShape: number[];
    inputDataType: string;
    outputShapes: number[][];
  };
  warnings: string[];
};

export type YoloDetectOptions = {
  allowFallback?: boolean;
};

export type YoloDetectFromImagePathInput = {
  imagePath: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type YoloCapturedImageInput = Pick<
  OcrCapturedImage,
  "uri" | "width" | "height" | "format" | "capturedAt"
>;

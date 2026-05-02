import type { YoloDetection } from "./types";

function clampDetectionsCount(value: number) {
  return Math.max(1, Math.min(3, value));
}

export function createFallbackBookDetections(
  imageWidth = 1080,
  imageHeight = 1440,
  seed = 0
): YoloDetection[] {
  const count = clampDetectionsCount((seed % 2) + 1);
  const detections: YoloDetection[] = [];

  for (let index = 0; index < count; index += 1) {
    const width = Math.round(imageWidth * 0.36);
    const height = Math.round(imageHeight * 0.54);
    const gap = Math.round(imageWidth * 0.06);
    const x = 48 + index * (width + gap);
    const y = 56 + index * 22;

    detections.push({
      x,
      y,
      width,
      height,
      confidence: index === 0 ? 0.91 : 0.78,
      classIndex: 0,
      className: "book",
    });
  }

  return detections;
}

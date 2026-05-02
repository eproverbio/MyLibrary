import type { ModelSource } from "react-native-fast-tflite";

export const yoloTestModelConfig = {
  modelName: "yolo-test",
  delegates: [] as const,
  inputWidth: 640,
  inputHeight: 640,
  channels: 3,
  confidenceThreshold: 0.25,
  iouThreshold: 0.45,
  maxDetections: 8,
};

export function getYoloTestModelSource(): ModelSource | null {
  return require("../../../assets/models/yolo_test.tflite");
}

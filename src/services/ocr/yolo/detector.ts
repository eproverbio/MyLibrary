import type { Tensor, TensorflowModel } from "react-native-fast-tflite";
import { getYoloTestModelSource, yoloTestModelConfig } from "./modelConfig";
import { createFallbackBookDetections } from "./fallbackDetections";
import { loadCachedTfliteModel } from "./runtime";
import type {
  YoloCapturedImageInput,
  YoloDetectFromImagePathInput,
  YoloDetectOptions,
  YoloDetection,
  YoloDetectionResult,
} from "./types";

function createSeedFromPath(imagePath: string) {
  return Array.from(imagePath).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getPrimaryInputTensor(model: TensorflowModel) {
  return model.inputs[0] ?? null;
}

function createZeroInputBuffer(inputTensor: Tensor) {
  const size = inputTensor.shape.reduce((total, value) => total * Math.max(value, 1), 1);
  const bytesPerValue = inputTensor.dataType === "float32" ? 4 : 1;
  const buffer = new ArrayBuffer(size * bytesPerValue);

  if (inputTensor.dataType === "float32") {
    const view = new Float32Array(buffer);
    view.fill(0);
  } else {
    const view = new Uint8Array(buffer);
    view.fill(0);
  }

  return buffer;
}

function getModelSummary(model: TensorflowModel) {
  const input = getPrimaryInputTensor(model);

  return {
    inputShape: input?.shape ?? [],
    inputDataType: input?.dataType ?? "unknown",
    outputShapes: model.outputs.map((output) => output.shape),
  };
}

function intersectionOverUnion(left: YoloDetection, right: YoloDetection) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;
  const unionArea = left.width * left.height + right.width * right.height - intersectionArea;

  if (unionArea <= 0) {
    return 0;
  }

  return intersectionArea / unionArea;
}

function nonMaximumSuppression(detections: YoloDetection[]) {
  const sorted = [...detections].sort((left, right) => right.confidence - left.confidence);
  const kept: YoloDetection[] = [];

  for (const detection of sorted) {
    const overlapsExisting = kept.some(
      (current) =>
        current.classIndex === detection.classIndex &&
        intersectionOverUnion(current, detection) > yoloTestModelConfig.iouThreshold
    );

    if (!overlapsExisting) {
      kept.push(detection);
    }

    if (kept.length >= yoloTestModelConfig.maxDetections) {
      break;
    }
  }

  return kept;
}

function decodeCommonYoloOutput(
  rawOutputs: ArrayBuffer[],
  model: TensorflowModel,
  imageWidth = 1080,
  imageHeight = 1440
): YoloDetection[] {
  const input = getPrimaryInputTensor(model);
  const output = rawOutputs[0];

  if (!input || !output) {
    return [];
  }

  const values = new Float32Array(output);
  const outputTensor = model.outputs[0];
  const shape = outputTensor?.shape ?? [];

  if (shape.length < 2) {
    return [];
  }

  let features = 0;
  let rows = 0;

  if (shape.length === 3) {
    const [, dimensionA, dimensionB] = shape;
    if (dimensionA > dimensionB) {
      features = dimensionA;
      rows = dimensionB;
    } else {
      features = dimensionB;
      rows = dimensionA;
    }
  } else if (shape.length === 2) {
    const [dimensionA, dimensionB] = shape;
    if (dimensionA > dimensionB) {
      features = dimensionA;
      rows = dimensionB;
    } else {
      features = dimensionB;
      rows = dimensionA;
    }
  }

  if (features < 5 || rows <= 0) {
    return [];
  }

  const scaleX = imageWidth / yoloTestModelConfig.inputWidth;
  const scaleY = imageHeight / yoloTestModelConfig.inputHeight;
  const detections: YoloDetection[] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const offset = rowIndex * features;
    const centerX = values[offset];
    const centerY = values[offset + 1];
    const width = values[offset + 2];
    const height = values[offset + 3];

    let bestClassIndex = 0;
    let bestScore = 0;

    for (let classOffset = 4; classOffset < features; classOffset += 1) {
      const score = values[offset + classOffset];

      if (score > bestScore) {
        bestScore = score;
        bestClassIndex = classOffset - 4;
      }
    }

    if (bestScore < yoloTestModelConfig.confidenceThreshold) {
      continue;
    }

    detections.push({
      x: Math.max(0, (centerX - width / 2) * scaleX),
      y: Math.max(0, (centerY - height / 2) * scaleY),
      width: Math.max(1, width * scaleX),
      height: Math.max(1, height * scaleY),
      confidence: bestScore,
      classIndex: bestClassIndex,
      className: bestClassIndex === 0 ? "book" : `class-${bestClassIndex}`,
    });
  }

  return nonMaximumSuppression(detections);
}

export async function detectBookBoundingBoxesFromImagePath(
  input: YoloDetectFromImagePathInput,
  options?: YoloDetectOptions
): Promise<YoloDetectionResult> {
  const allowFallback = options?.allowFallback ?? true;
  const seed = createSeedFromPath(input.imagePath);
  const modelSource = getYoloTestModelSource();
  const fallbackDetections = createFallbackBookDetections(input.imageWidth, input.imageHeight, seed);

  if (!modelSource) {
    return {
      engineName: yoloTestModelConfig.modelName,
      source: allowFallback ? "model-not-configured" : "fallback",
      detections: allowFallback ? fallbackDetections : [],
      warnings: [
        "No bundled YOLO .tflite model is configured yet. Add assets/models/yolo_test.tflite and update getYoloTestModelSource().",
      ],
    };
  }

  try {
    const model = await loadCachedTfliteModel(modelSource, [...yoloTestModelConfig.delegates]);
    const inputTensor = getPrimaryInputTensor(model);

    if (!inputTensor) {
      return {
        engineName: yoloTestModelConfig.modelName,
        source: allowFallback ? "fallback" : "tflite-model",
        detections: allowFallback ? fallbackDetections : [],
        modelSummary: getModelSummary(model),
        warnings: ["The YOLO model loaded, but no input tensor metadata was exposed."],
      };
    }

    // Temporary smoke-test input. The TFLite runtime is real, but image decoding/resizing
    // still needs to be wired before we can feed camera pixels to the model.
    const rawOutputs = await model.run([createZeroInputBuffer(inputTensor)]);
    const detections = decodeCommonYoloOutput(
      rawOutputs,
      model,
      input.imageWidth,
      input.imageHeight
    );

    if (detections.length > 0) {
      return {
        engineName: yoloTestModelConfig.modelName,
        source: "tflite-model",
        detections,
        modelSummary: getModelSummary(model),
        warnings: [
          "Current YOLO step uses a zero-filled smoke-test tensor until image preprocessing is connected.",
        ],
      };
    }

    return {
      engineName: yoloTestModelConfig.modelName,
      source: allowFallback ? "fallback" : "tflite-model",
      detections: allowFallback ? fallbackDetections : [],
      modelSummary: getModelSummary(model),
      warnings: [
        "The TFLite model loaded and executed, but no detections were decoded yet. This is expected until real image preprocessing is connected.",
      ],
    };
  } catch (error) {
    return {
      engineName: yoloTestModelConfig.modelName,
      source: allowFallback ? "tflite-runtime-unavailable" : "fallback",
      detections: allowFallback ? fallbackDetections : [],
      warnings: [
        error instanceof Error ? error.message : "Unknown TFLite runtime error while loading YOLO.",
      ],
    };
  }
}

export async function detectBookBoundingBoxesFromCapturedImage(
  image: YoloCapturedImageInput,
  options?: YoloDetectOptions
) {
  return detectBookBoundingBoxesFromImagePath(
    {
      imagePath: image.uri,
      imageWidth: image.width,
      imageHeight: image.height,
    },
    options
  );
}

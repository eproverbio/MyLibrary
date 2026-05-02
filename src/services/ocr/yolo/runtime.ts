import type {
  ModelSource,
  TensorflowModel,
  TensorflowModelDelegate,
} from "react-native-fast-tflite";

let cachedModelPromise: Promise<TensorflowModel> | null = null;

function getFastTfliteModule() {
  return require("react-native-fast-tflite") as typeof import("react-native-fast-tflite");
}

export async function loadCachedTfliteModel(
  source: ModelSource,
  delegates: TensorflowModelDelegate[]
): Promise<TensorflowModel> {
  if (!cachedModelPromise) {
    cachedModelPromise = getFastTfliteModule().loadTensorflowModel(source, [...delegates]);
  }

  return cachedModelPromise;
}

export function resetCachedTfliteModel() {
  cachedModelPromise = null;
}

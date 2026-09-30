import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
  type Tensor,
} from "@huggingface/transformers";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url";
import wasmModule from "onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url";
import vocabulary from "./tag-vocabulary.json";
import vocabularyHash from "../../public/tag-model/vocabulary-v1.sha256?raw";

env.allowLocalModels = true;
env.cacheKey = "moment-tag-model-v1";
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;
env.backends.onnx.wasm!.wasmPaths = {
  wasm: new URL(wasmUrl, self.location.origin).href,
  mjs: new URL(wasmModule, self.location.origin).href,
};
let model: CLIPVisionModelWithProjection | undefined;
let processor:
  | Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
  | undefined;
let vectors: Float32Array | undefined;
let busy = false;
const emit = (data: unknown) => self.postMessage(data);
self.onmessage = async ({ data }) => {
  if (busy) {
    emit({ id: data.id, type: "error", message: "模型正在处理上一张图片" });
    return;
  }
  busy = true;
  try {
    if (data.type === "dispose") {
      await model?.dispose();
      model = undefined;
      processor = undefined;
      vectors = undefined;
      emit({ id: data.id, type: "done" });
      return;
    }
    if (data.type === "init") {
      if (model && processor && vectors) {
        emit({ id: data.id, type: "ready" });
        return;
      }
      const local = data.source === "local";
      env.allowLocalModels = local;
      env.allowRemoteModels = !local;
      const id = local
        ? import.meta.env.BASE_URL + "tag-model/local/"
        : vocabulary.model;
      let lastProgress = 0;
      const progress_callback = (event: any) => {
        if (
          event.status === "progress" &&
          (event.loaded === event.total ||
            performance.now() - lastProgress >= 100)
        ) {
          lastProgress = performance.now();
          emit({
            id: data.id,
            type: "progress",
            loaded: event.loaded,
            total: event.total,
            file: event.file,
          });
        }
      };
      const options = {
        revision: vocabulary.revision,
        dtype: "q8" as const,
        device: "wasm" as const,
        progress_callback,
      };
      processor = await AutoProcessor.from_pretrained(id, options);
      model = await CLIPVisionModelWithProjection.from_pretrained(id, options);
      const response = await fetch(
        new URL(
          import.meta.env.BASE_URL + "tag-model/vocabulary-v1.json",
          self.location.origin,
        ),
      );
      if (!response.ok) throw new Error("标签词库加载失败");
      const vectorData = await response.json();
      if (
        vectorData.version !== vocabulary.version ||
        vectorData.dimensions !== vocabulary.dimensions ||
        typeof vectorData.data !== "string"
      )
        throw new Error("标签词库版本不匹配");
      const vectorBytes = Uint8Array.from(atob(vectorData.data), (char) =>
        char.charCodeAt(0),
      ).buffer;
      if (
        vectorBytes.byteLength !==
        vocabulary.labels.length * vocabulary.dimensions * 4
      )
        throw new Error("标签词库版本不匹配");
      const digest = await crypto.subtle.digest("SHA-256", vectorBytes);
      const hash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== vocabularyHash.trim()) throw new Error("标签词库校验失败");
      vectors = new Float32Array(vectorBytes);
      emit({ id: data.id, type: "ready" });
    } else if (data.type === "infer") {
      if (!model || !processor || !vectors) throw new Error("请先加载识别模型");
      const image = await RawImage.fromBlob(data.blob);
      const inputs = await processor(image);
      let output: Record<string, Tensor> | undefined;
      try {
        output = await model(inputs);
        const embedding = Array.from(output!.image_embeds.data as Float32Array);
        const norm = Math.hypot(...embedding);
        if (
          !Number.isFinite(norm) ||
          norm === 0 ||
          embedding.length !== vocabulary.dimensions
        )
          throw new Error("模型未返回有效结果");
        const scores = vocabulary.labels
          .map(([label], index) => {
            let score = 0;
            for (let column = 0; column < embedding.length; column++)
              score +=
                (embedding[column] / norm) *
                vectors![index * embedding.length + column];
            return { label, score };
          })
          .filter((item) => Number.isFinite(item.score))
          .sort((a, b) => b.score - a.score);
        // Cosine similarity is not a probability. Keep only strong nearby
        // candidates rather than filling the list with unrelated labels.
        const minimum = Math.max(0.24, (scores[0]?.score || 0) - 0.04);
        emit({
          id: data.id,
          type: "result",
          suggestions: scores
            .filter((item) => item.score >= minimum)
            .slice(0, 4),
        });
      } finally {
        Object.values(inputs).forEach((value) => (value as Tensor).dispose?.());
        Object.values(output || {}).forEach((value) => value.dispose?.());
      }
    }
  } catch (error) {
    if (data.type === "init") {
      await model?.dispose().catch(() => {});
      model = undefined;
      processor = undefined;
      vectors = undefined;
    }
    emit({
      id: data.id,
      type: "error",
      message: error instanceof Error ? error.message : "模型运行失败",
    });
  } finally {
    busy = false;
  }
};

export type TagSuggestion = { label: string; score: number };
export interface ModelProgress {
  loaded: number;
  total: number;
  file: string;
}
export class TagModel {
  private worker = new Worker(
    new URL("./tag-model.worker.ts", import.meta.url),
    { type: "module" },
  );
  private serial = 0;
  private pending = new Map<
    number,
    {
      resolve: (result: any) => void;
      reject: (error: Error) => void;
      timer: number;
    }
  >();
  private closed = false;
  onProgress?: (event: ModelProgress) => void;
  constructor() {
    this.worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        this.onProgress?.(data);
        return;
      }
      const pending = this.pending.get(data.id);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      this.pending.delete(data.id);
      data.type === "error"
        ? pending.reject(new Error(data.message))
        : pending.resolve(data.suggestions);
    };
    this.worker.onerror = () =>
      this.close(
        new Error(
          "此浏览器无法运行识别模型，请使用新版 Chrome、Edge 或手动添加标签",
        ),
      );
  }
  private request(
    type: string,
    payload: Record<string, unknown> = {},
    timeout = 120_000,
  ): Promise<any> {
    if (this.closed) return Promise.reject(new Error("识别已取消"));
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      const timer = window.setTimeout(
        () => this.close(new Error("模型加载或识别超时，请检查网络后重试")),
        timeout,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, type, ...payload });
    });
  }
  load(source: "remote" | "local") {
    return this.request("init", { source }, 300_000);
  }
  infer(blob: Blob): Promise<TagSuggestion[]> {
    return this.request("infer", { blob });
  }
  close(error = new Error("识别已取消")) {
    if (this.closed) return;
    this.closed = true;
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timer);
      request.reject(error);
    }
    this.pending.clear();
    this.worker.terminate();
  }
  async dispose() {
    if (this.closed) return;
    try {
      await this.request("dispose", {}, 2000);
    } finally {
      this.close();
    }
  }
}

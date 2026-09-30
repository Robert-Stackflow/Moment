import { notifications } from "@mantine/notifications";
import type { Result } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit & { preserveEditorOnUnauthorized?: boolean } = {},
): Promise<Result<T>> {
  const { preserveEditorOnUnauthorized, ...request } = options;
  const response = await fetch(`/api/admin${path}`, {
    ...request,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.code !== 200) {
    if (
      response.status === 401 &&
      !preserveEditorOnUnauthorized &&
      path !== "/login" &&
      path !== "/me"
    )
      window.dispatchEvent(new Event("moment-session-expired"));
    throw new ApiError(response.status, result?.msg || "请求失败，请稍后重试");
  }
  return result as Result<T>;
}
export function notifyError(error: unknown) {
  notifications.show({
    color: "red",
    title: "操作未完成",
    message: error instanceof Error ? error.message : "请稍后重试",
  });
}
export function notifySuccess(message = "已保存") {
  notifications.show({ color: "green", message });
}
export function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}
export function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<{ image_url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", "/api/admin/uploads");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      let result: Result<{ image_url: string }>;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("上传响应无效"));
        return;
      }
      if (xhr.status === 200 && result.code === 200) resolve(result.data);
      else reject(new ApiError(xhr.status, result.msg || "上传失败"));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("连接中断，请重试"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error("上传已取消"));
    };
    if (signal.aborted) {
      cleanup();
      reject(new Error("上传已取消"));
      return;
    }
    xhr.send(body);
  });
}

import {
  Button,
  FileDropZone,
  FilePicker,
  Progress,
} from "@robert-stackflow/oneui";
import { RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "../api";
import type { Photo } from "../types";
interface Job {
  id: string;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "done" | "failed";
  error?: string;
}
export function UploadQueue({
  onPhoto,
  onBusy,
  limit,
  enabled,
  remaining,
  compact = false,
}: {
  onPhoto: (photo: Photo) => void;
  onBusy: (busy: boolean) => void;
  limit: number;
  enabled: boolean;
  remaining: number;
  compact?: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const callbacks = useRef({ onPhoto, onBusy });
  callbacks.current = { onPhoto, onBusy };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  function update(id: string, value: Partial<Job>) {
    if (mounted.current)
      setJobs((current) =>
        current.map((job) => (job.id === id ? { ...job, ...value } : job)),
      );
  }
  async function run(batch: Job[]) {
    if (running.current) return;
    running.current = true;
    callbacks.current.onBusy(true);
    controller.current = new AbortController();
    try {
      for (const job of batch) {
        if (!mounted.current) break;
        update(job.id, { status: "uploading", progress: 0, error: undefined });
        try {
          const result = await uploadFile(
            job.file,
            (percent) => update(job.id, { progress: percent }),
            controller.current.signal,
          );
          const photo: Photo = {
            _key: crypto.randomUUID(),
            image_url: result.image_url,
            title: "",
            desc: "",
            location: "",
            time: null,
            metadata: "",
            is_hidden: false,
            order: 0,
          };
          try {
            const exifr = await import("exifr");
            const exif = await exifr.parse(job.file, [
              "Make",
              "Model",
              "ISO",
              "FocalLength",
              "FNumber",
              "ExposureTime",
              "DateTimeOriginal",
            ]);
            if (exif) {
              photo.metadata = [
                exif.Make,
                exif.Model,
                exif.ISO ? `ISO ${exif.ISO}` : "",
                exif.FocalLength ? `${exif.FocalLength}mm` : "",
                exif.FNumber ? `f/${exif.FNumber}` : "",
              ]
                .filter(Boolean)
                .join(" · ");
              if (exif.DateTimeOriginal instanceof Date) {
                const date = exif.DateTimeOriginal;
                const pad = (n: number) => String(n).padStart(2, "0");
                photo.time = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
              }
            }
            const gps = await exifr.gps(job.file);
            if (
              gps &&
              Number.isFinite(gps.latitude) &&
              Number.isFinite(gps.longitude) &&
              Math.abs(gps.latitude) <= 90 &&
              Math.abs(gps.longitude) <= 180
            ) {
              photo.discovery = {
                latitude: gps.latitude,
                longitude: gps.longitude,
                precision: "private",
                timeline: "inherit",
              };
            }
          } catch {
            /* EXIF is optional; an otherwise valid upload remains usable. */
          }
          if (mounted.current) callbacks.current.onPhoto(photo);
          update(job.id, { status: "done", progress: 100 });
        } catch (error) {
          update(job.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "上传失败",
          });
        }
      }
    } finally {
      running.current = false;
      if (mounted.current) callbacks.current.onBusy(false);
    }
  }
  function enqueue(files: File[]) {
    if (running.current) return;
    const batch = files.slice(0, remaining).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "waiting" as const,
    }));
    setJobs((current) => [...current, ...batch]);
    void run(batch);
  }
  const busy = jobs.some(
    (job) => job.status === "uploading" || job.status === "waiting",
  );
  return (
    <div
      className="ui-stack"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {!compact && (
        <p
          className="ui-text"
          style={{
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          自动读取拍摄时间与 GPS（如有）；GPS 默认不公开，可在图片详情中调整。
        </p>
      )}
      <FileDropZone
        maxSize={limit * 1024 * 1024}
        disabled={busy || !enabled || remaining <= 0}
        onReject={(files) =>
          setJobs((current) => [
            ...current,
            ...files.map((item) => ({
              id: crypto.randomUUID(),
              file: item.file,
              progress: 0,
              status: "failed" as const,
              error: `格式不支持或超过 ${limit} MB 限制`,
            })),
          ])
        }
        className={compact ? "upload-zone is-compact" : "upload-zone"}
        accept={"image/*"}
        onFiles={enqueue}
      >
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            ...{ pointerEvents: "none" },
          }}
        >
          <Upload size={28} strokeWidth={1.5} color="var(--moment-accent)" />
          <div>
            <p
              className="ui-text"
              style={{
                fontWeight: 500,
              }}
            >
              {enabled
                ? compact
                  ? "继续添加照片"
                  : "拖入照片，或点击选择文件"
                : "文件上传已关闭"}
            </p>
            <p
              className="ui-text"
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              支持批量选择 · 每张最多 {limit} MB · 自动读取拍摄信息
            </p>
          </div>
        </div>
        <FilePicker
          onFiles={enqueue}
          accept={"image/*"}
          maxSize={limit * 1048576}
          maxFiles={remaining}
          disabled={busy || !enabled || remaining <= 0}
          label={"\u9009\u62E9\u7167\u7247"}
        />
      </FileDropZone>
      {jobs.length ? (
        <div
          aria-live="polite"
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {jobs.some((job) => job.status === "done") && (
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <p
                className="ui-text"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                已添加 {jobs.filter((job) => job.status === "done").length}{" "}
                张照片
              </p>
              <Button
                onClick={() =>
                  setJobs((current) =>
                    current.filter((job) => job.status !== "done"),
                  )
                }
                variant="ghost"
              >
                清除完成记录
              </Button>
            </div>
          )}
          {jobs
            .filter((job) => job.status !== "done")
            .map((job) => (
              <div className="upload-line" key={job.id}>
                <div className="filename">
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                    }}
                  >
                    {job.file.name}
                  </p>
                  {job.status === "uploading" ? (
                    <div
                      style={{
                        marginTop: 6,
                      }}
                    >
                      <Progress
                        value={job.progress}
                        label={`${job.file.name} 上传进度`}
                      />
                    </div>
                  ) : (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color:
                          job.status === "failed"
                            ? "var(--danger)"
                            : "var(--muted)",
                      }}
                    >
                      {job.error || "等待上传"}
                    </p>
                  )}
                </div>
                {job.status === "failed" && enabled ? (
                  <Button
                    size="small"
                    disabled={
                      busy ||
                      remaining <= 0 ||
                      job.file.size > limit * 1024 * 1024
                    }
                    onClick={() => void run([job])}
                    variant="ghost"
                  >
                    {<RotateCcw size={14} />}
                    重试
                  </Button>
                ) : (
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    {job.progress}%
                  </p>
                )}
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Button, Group, Progress, Stack, Text } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { RotateCcw, Upload } from "lucide-react";
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
                photo.time = `${date.getFullYear()}-${pad(
                  date.getMonth() + 1,
                )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
                  date.getMinutes(),
                )}:${pad(date.getSeconds())}`;
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
    <Stack gap="md">
      {!compact && (
        <Text size="xs" c="dimmed">
          自动读取拍摄时间与 GPS（如有）；GPS 默认不公开，可在图片详情中调整。
        </Text>
      )}
      <Dropzone
        accept={IMAGE_MIME_TYPE}
        maxSize={limit * 1024 * 1024}
        disabled={busy || !enabled || remaining <= 0}
        onDrop={enqueue}
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
        radius="lg"
        p={compact ? "md" : "xl"}
        className={compact ? "upload-zone is-compact" : "upload-zone"}
      >
        <Group justify="center" gap="md" style={{ pointerEvents: "none" }}>
          <Upload size={28} strokeWidth={1.5} color="var(--moment-accent)" />
          <div>
            <Text fw={500}>
              {enabled
                ? compact
                  ? "继续添加照片"
                  : "拖入照片，或点击选择文件"
                : "文件上传已关闭"}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              支持批量选择 · 每张最多 {limit} MB · 自动读取拍摄信息
            </Text>
          </div>
        </Group>
      </Dropzone>
      {jobs.length ? (
        <Stack gap={12} aria-live="polite">
          {jobs.some((job) => job.status === "done") && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                已添加 {jobs.filter((job) => job.status === "done").length}{" "}
                张照片
              </Text>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                onClick={() =>
                  setJobs((current) =>
                    current.filter((job) => job.status !== "done"),
                  )
                }
              >
                清除完成记录
              </Button>
            </Group>
          )}
          {jobs
            .filter((job) => job.status !== "done")
            .map((job) => (
              <div className="upload-line" key={job.id}>
                <div className="filename">
                  <Text size="sm" truncate>
                    {job.file.name}
                  </Text>
                  {job.status === "uploading" ? (
                    <Progress
                      value={job.progress}
                      size="xs"
                      mt={6}
                      aria-label={`${job.file.name} 上传进度`}
                    />
                  ) : (
                    <Text
                      size="xs"
                      c={job.status === "failed" ? "red" : "dimmed"}
                    >
                      {job.error || "等待上传"}
                    </Text>
                  )}
                </div>
                {job.status === "failed" && enabled ? (
                  <Button
                    variant="subtle"
                    size="xs"
                    disabled={
                      busy ||
                      remaining <= 0 ||
                      job.file.size > limit * 1024 * 1024
                    }
                    leftSection={<RotateCcw size={14} />}
                    onClick={() => void run([job])}
                  >
                    重试
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed">
                    {job.progress}%
                  </Text>
                )}
              </div>
            ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

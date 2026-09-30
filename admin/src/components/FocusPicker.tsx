import { useState } from "react";
import { Button, Group, Slider, Stack, Text } from "@mantine/core";
import { RotateCcw } from "lucide-react";

export function FocusPicker({
  src,
  x = 50,
  y = 50,
  onChange,
}: {
  src: string;
  x?: number;
  y?: number;
  onChange: (x: number, y: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  const position = `${x}% ${y}%`;
  function point(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onChange(
      Math.round(
        Math.max(
          0,
          Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
        ),
      ),
      Math.round(
        Math.max(
          0,
          Math.min(100, ((event.clientY - rect.top) / rect.height) * 100),
        ),
      ),
    );
  }
  return (
    <Stack gap="sm" className="focus-picker">
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          封面焦点
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<RotateCcw size={12} />}
          onClick={() => onChange(50, 50)}
          disabled={x === 50 && y === 50}
        >
          居中
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        点击或拖动圆点，让重要部分留在画面中。仅影响缩略图裁切，原图保持完整。
      </Text>
      <div className="focus-source-wrap">
        {failed ? (
          <Text size="xs" c="dimmed">
            图片暂时无法预览，可用下方滑块调整。
          </Text>
        ) : (
          <button
            type="button"
            className="focus-source"
            aria-label="调整封面焦点，方向键微调"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              point(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                point(event);
            }}
            onKeyDown={(event) => {
              const directions: Record<string, number[]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              const delta = directions[event.key];
              if (!delta) return;
              event.preventDefault();
              const step = event.shiftKey ? 10 : 1;
              onChange(
                Math.max(0, Math.min(100, x + delta[0] * step)),
                Math.max(0, Math.min(100, y + delta[1] * step)),
              );
            }}
          >
            <img
              src={src}
              alt="选择照片中的重要位置"
              draggable={false}
              onError={() => setFailed(true)}
            />
            <span
              className="focus-point"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          </button>
        )}
      </div>
      {!failed && (
        <div className="focus-previews" aria-label="封面裁切预览">
          <figure>
            <img
              src={src}
              style={{ objectPosition: position }}
              alt="横向封面预览"
            />
            <figcaption>横向</figcaption>
          </figure>
          <figure>
            <img
              src={src}
              style={{ objectPosition: position }}
              alt="方形封面预览"
            />
            <figcaption>方形</figcaption>
          </figure>
        </div>
      )}
      <div className="focus-sliders">
        <div>
          <Text size="xs" c="dimmed" mb={8}>
            水平 · {x}%
          </Text>
          <Slider
            thumbLabel="焦点水平位置"
            value={x}
            onChange={(value) => onChange(value, y)}
          />
        </div>
        <div>
          <Text size="xs" c="dimmed" mb={8}>
            垂直 · {y}%
          </Text>
          <Slider
            thumbLabel="焦点垂直位置"
            value={y}
            onChange={(value) => onChange(x, value)}
          />
        </div>
      </div>
    </Stack>
  );
}

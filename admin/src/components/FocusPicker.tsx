import { Button, Slider } from "@robert-stackflow/oneui";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
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
    <div
      className={"ui-stack " + "focus-picker"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
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
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          封面焦点
        </p>
        <Button
          onClick={() => onChange(50, 50)}
          disabled={x === 50 && y === 50}
          variant="ghost"
        >
          {<RotateCcw size={12} />}
          居中
        </Button>
      </div>
      <p
        className="ui-text"
        style={{
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        点击或拖动圆点，让重要部分留在画面中。仅影响缩略图裁切，原图保持完整。
      </p>
      <div className="focus-source-wrap">
        {failed ? (
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            图片暂时无法预览，可用下方滑块调整。
          </p>
        ) : (
          <Button
            type="button"
            className="focus-source image-action app-button-layout"
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
            variant="ghost"
          >
            <img
              src={src}
              alt="选择照片中的重要位置"
              draggable={false}
              onError={() => setFailed(true)}
            />
            <span
              className="focus-point"
              style={{
                ...{ left: `${x}%`, top: `${y}%` },
              }}
            />
          </Button>
        )}
      </div>
      {!failed && (
        <div className="focus-previews" aria-label="封面裁切预览">
          <figure>
            <img
              src={src}
              alt="横向封面预览"
              style={{
                ...{ objectPosition: position },
              }}
            />
            <figcaption>横向</figcaption>
          </figure>
          <figure>
            <img
              src={src}
              alt="方形封面预览"
              style={{
                ...{ objectPosition: position },
              }}
            />
            <figcaption>方形</figcaption>
          </figure>
        </div>
      )}
      <div className="focus-sliders">
        <div>
          <Slider
            value={x}
            onChange={(value) => onChange(value, y)}
            label={"焦点水平位置"}
          />
        </div>
        <div>
          <Slider
            value={y}
            onChange={(value) => onChange(x, value)}
            label={"焦点垂直位置"}
          />
        </div>
      </div>
    </div>
  );
}

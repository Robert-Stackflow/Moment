import { Alert, Button, Dialog } from "@robert-stackflow/oneui";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { tone } from "../ui-data";
import { DateTimePicker } from "./DateTimePicker";
import { UnsavedChanges } from "./UnsavedChanges";
export function shanghaiDate(value: number) {
  return new Date(value)
    .toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" })
    .replace(" ", "T");
}
export function scheduleTime(value: number) {
  return shanghaiDate(value * 1000).replace("T", " ");
}
// Mount for each selection so an old dialog never keeps another draft's time.
export function ScheduleDialog({
  title,
  initialTime,
  parentDirty = false,
  onClose,
  onConfirm,
}: {
  title: string;
  initialTime?: number;
  parentDirty?: boolean;
  onClose: () => void;
  onConfirm: (publishAt: number) => Promise<void>;
}) {
  const [initial] = useState(() =>
    shanghaiDate(initialTime ? initialTime * 1000 : Date.now() + 3600000),
  );
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    const timestamp = Date.parse(`${value}+08:00`);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      setError("请选择未来的发布时间");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(Math.floor(timestamp / 1000));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存计划失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={true} onClose={() => !busy && onClose()} title="安排发布时间">
      <UnsavedChanges
        dirty={value !== initial || parentDirty || busy}
        message="发布计划尚未保存，离开后将丢失本次时间设置。"
      />
      <div
        className="ui-stack"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <p
          className="ui-text"
          style={{
            fontWeight: 600,
          }}
        >
          {title || "未命名草稿"}
        </p>
        <fieldset disabled={busy} className="editor-fieldset">
          <DateTimePicker
            label="发布时间"
            description="北京时间 · UTC+8，与设备时区无关"
            value={value}
            onChange={setValue}
            timeZone="Asia/Shanghai"
          />
        </fieldset>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {[
            { label: "1 小时后", hours: 1 },
            { label: "明天此时", hours: 24 },
          ].map(({ label, hours }) => (
            <Button
              key={hours}
              size="small"
              disabled={busy}
              onClick={() =>
                setValue(shanghaiDate(Date.now() + hours * 3600000))
              }
              variant="secondary"
            >
              {label}
            </Button>
          ))}
        </div>
        <p
          className="ui-text"
          style={{
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          到期后公开这份草稿；现有帖子在发布前保持原样。计划期间内容锁定，修改内容需先取消计划。服务停机时将在重启后补发。
        </p>
        {error && <Alert tone={tone("red")}>{error}</Alert>}
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <Button disabled={busy} onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            loading={busy}
            onClick={() => void confirm()}
            variant="primary"
          >
            {<CalendarClock size={16} />}
            确认计划
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

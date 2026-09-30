import { useId, useRef, useState } from "react";
import { ActionIcon, Button, Group, Input, Popover, Text } from "@mantine/core";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import {
  localDateTime,
  calendarDateTime,
  monthDays,
  parseDateTime,
  shiftMonth,
} from "./dateTime";

export function DateTimePicker({
  label,
  description,
  value,
  onChange,
  placeholder = "选择日期和时间",
  timeZone,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  timeZone?: string;
}) {
  const getNow = () =>
    parseDateTime(
      timeZone
        ? new Date().toLocaleString("sv-SE", { timeZone }).replace(" ", "T")
        : localDateTime(new Date()),
    )!;
  const id = useId();
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState(() => parseDateTime(value) || getNow());
  const [month, setMonth] = useState(getNow);
  const [pickingMonth, setPickingMonth] = useState(false);
  const [parts, setParts] = useState(["00", "00", "00"]);
  const grid = useRef<HTMLDivElement>(null);
  const selected = parseDateTime(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = (date: Date) => calendarDateTime(date).slice(0, 10);
  const today = key(getNow());
  const validTime = parts.every(
    (part, index) =>
      /^\d{1,2}$/.test(part) && Number(part) <= (index === 0 ? 23 : 59),
  );
  function choose(date: Date) {
    setDraft(date);
    setMonth(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  }
  function open() {
    const date = parseDateTime(value) || getNow();
    choose(date);
    setParts([
      pad(date.getUTCHours()),
      pad(date.getUTCMinutes()),
      pad(date.getUTCSeconds()),
    ]);
    setPickingMonth(false);
    setOpened(true);
  }
  function shortcut(offset: number) {
    const date = getNow();
    date.setUTCDate(date.getUTCDate() + offset);
    choose(date);
    setParts([
      pad(date.getUTCHours()),
      pad(date.getUTCMinutes()),
      pad(date.getUTCSeconds()),
    ]);
    setPickingMonth(false);
  }
  function apply() {
    if (!validTime) return;
    const date = new Date(draft);
    date.setUTCHours(Number(parts[0]), Number(parts[1]), Number(parts[2]), 0);
    onChange(calendarDateTime(date));
    setOpened(false);
  }
  function moveFocus(
    date: Date,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -(date.getUTCDay() + 6) % 7,
      End: 6 - ((date.getUTCDay() + 6) % 7),
    };
    let next: Date;
    if (event.key === "PageUp" || event.key === "PageDown")
      next = shiftMonth(date, event.key === "PageUp" ? -1 : 1);
    else if (event.key in offsets) {
      next = new Date(date);
      next.setUTCDate(next.getUTCDate() + offsets[event.key]);
    } else return;
    if (next.getUTCFullYear() < 1000 || next.getUTCFullYear() > 9999) return;
    event.preventDefault();
    choose(next);
    requestAnimationFrame(() =>
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${key(next)}"]`)
        ?.focus(),
    );
  }
  return (
    <Input.Wrapper label={label} description={description} id={id}>
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-end"
        width={338}
        offset={8}
        trapFocus
        returnFocus
        withinPortal
        middlewares={{ flip: true, shift: { padding: 12, crossAxis: true } }}
        transitionProps={{
          transition: "pop-top-right",
          duration: 180,
          timingFunction: "cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <Popover.Target>
          <button
            id={id}
            type="button"
            className="date-trigger"
            onClick={() => (opened ? setOpened(false) : open())}
            aria-label={`${label}：${
              selected ? value.replace("T", " ") : "未设置"
            }`}
          >
            <CalendarDays size={17} />
            <span className={selected ? "" : "is-placeholder"}>
              {selected
                ? `${key(selected).replaceAll("-", " / ")} · ${pad(
                    selected.getUTCHours(),
                  )}:${pad(selected.getUTCMinutes())}:${pad(
                    selected.getUTCSeconds(),
                  )}`
                : placeholder}
            </span>
            <ChevronDown size={15} />
          </button>
        </Popover.Target>
        <Popover.Dropdown className="date-panel" aria-label={`${label}选择器`}>
          <div className="date-panel-top">
            <span>
              <CalendarDays size={16} />
              选择日期与时间
            </span>
            <div className="date-shortcuts">
              <button type="button" onClick={() => shortcut(-1)}>
                昨天
              </button>
              <button type="button" onClick={() => shortcut(0)}>
                现在
              </button>
            </div>
          </div>
          <div className="date-month-nav">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={pickingMonth ? "上一年" : "上个月"}
              disabled={
                month.getUTCFullYear() <= 1000 &&
                (pickingMonth || month.getUTCMonth() === 0)
              }
              onClick={() =>
                setMonth(shiftMonth(month, pickingMonth ? -12 : -1))
              }
            >
              <ChevronLeft size={17} />
            </ActionIcon>
            <button
              className="date-month-title"
              type="button"
              onClick={() => setPickingMonth(!pickingMonth)}
              aria-label="选择年月"
            >
              {month.getUTCFullYear()} 年
              {!pickingMonth && ` ${month.getUTCMonth() + 1} 月`}
              <ChevronDown size={14} />
            </button>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={pickingMonth ? "下一年" : "下个月"}
              disabled={
                month.getUTCFullYear() >= 9999 &&
                (pickingMonth || month.getUTCMonth() === 11)
              }
              onClick={() => setMonth(shiftMonth(month, pickingMonth ? 12 : 1))}
            >
              <ChevronRight size={17} />
            </ActionIcon>
          </div>
          {pickingMonth ? (
            <div className="date-month-picker view-enter">
              <label className="date-year-input">
                年份
                <input
                  aria-label="年份"
                  type="number"
                  min={1000}
                  max={9999}
                  defaultValue={month.getUTCFullYear()}
                  key={month.getUTCFullYear()}
                  onBlur={(e) => {
                    const year = Number(e.target.value);
                    if (year >= 1000 && year <= 9999)
                      setMonth(
                        new Date(Date.UTC(year, month.getUTCMonth(), 1)),
                      );
                    else e.target.value = String(month.getUTCFullYear());
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <div className="date-month-grid">
                {Array.from({ length: 12 }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    data-selected={month.getUTCMonth() === index || undefined}
                    onClick={() => {
                      setMonth(
                        new Date(Date.UTC(month.getUTCFullYear(), index, 1)),
                      );
                      setPickingMonth(false);
                    }}
                  >
                    {index + 1} 月
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              key={`${month.getUTCFullYear()}-${month.getUTCMonth()}`}
              className="date-calendar view-enter"
            >
              <div className="date-weekdays" aria-hidden="true">
                {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div
                className="date-days"
                role="group"
                aria-label={`${month.getUTCFullYear()}年${
                  month.getUTCMonth() + 1
                }月`}
                ref={grid}
              >
                {monthDays(month.getUTCFullYear(), month.getUTCMonth()).map(
                  (date) => (
                    <button
                      type="button"
                      key={key(date)}
                      data-date={key(date)}
                      data-outside={
                        date.getUTCMonth() !== month.getUTCMonth() || undefined
                      }
                      data-today={key(date) === today || undefined}
                      data-selected={key(date) === key(draft) || undefined}
                      aria-label={key(date)}
                      aria-pressed={key(date) === key(draft)}
                      disabled={
                        date.getUTCFullYear() < 1000 ||
                        date.getUTCFullYear() > 9999
                      }
                      tabIndex={
                        key(date) === key(draft) ||
                        ((draft.getUTCMonth() !== month.getUTCMonth() ||
                          draft.getUTCFullYear() !== month.getUTCFullYear()) &&
                          date.getUTCDate() === 1 &&
                          date.getUTCMonth() === month.getUTCMonth())
                          ? 0
                          : -1
                      }
                      onClick={() => choose(date)}
                      onKeyDown={(event) => moveFocus(date, event)}
                    >
                      {date.getUTCDate()}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
          <div className="date-time-row">
            <span>
              <Clock3 size={16} />
              时间
            </span>
            <div className="date-time-parts">
              {["时", "分", "秒"].map((unit, index) => (
                <label key={unit}>
                  <input
                    aria-label={unit}
                    inputMode="numeric"
                    maxLength={2}
                    value={parts[index]}
                    aria-invalid={
                      !/^\d{1,2}$/.test(parts[index]) ||
                      Number(parts[index]) > (index === 0 ? 23 : 59)
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      if (/^\d{0,2}$/.test(v))
                        setParts((current) =>
                          current.map((part, i) => (i === index ? v : part)),
                        );
                    }}
                    onBlur={() =>
                      setParts((current) =>
                        current.map((part, i) =>
                          i === index && part ? pad(Number(part)) : part,
                        ),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        apply();
                      }
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const max = index === 0 ? 24 : 60;
                        setParts((current) =>
                          current.map((part, i) =>
                            i === index
                              ? pad(
                                  (Number(part) +
                                    (e.key === "ArrowUp" ? 1 : -1) +
                                    max) %
                                    max,
                                )
                              : part,
                          ),
                        );
                      }
                    }}
                  />
                  <span>{unit}</span>
                </label>
              ))}
            </div>
          </div>
          {!validTime && (
            <Text size="xs" c="red" role="alert">
              时间范围为 00:00:00 至 23:59:59
            </Text>
          )}
          <Group justify="space-between" className="date-panel-footer">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                onChange("");
                setOpened(false);
              }}
            >
              清除
            </Button>
            <Group gap={7}>
              <Button
                size="xs"
                variant="default"
                onClick={() => setOpened(false)}
              >
                取消
              </Button>
              <Button
                size="xs"
                disabled={!validTime}
                leftSection={<Check size={14} />}
                onClick={apply}
              >
                确定
              </Button>
            </Group>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}

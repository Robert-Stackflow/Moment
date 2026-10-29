import {
  Alert,
  Button,
  Card,
  IconButton,
  Input,
} from "@robert-stackflow/oneui";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { IconPicker } from "./IconPicker";
export interface Entry {
  name: string;
  icon: string;
  url: string;
  [key: string]: unknown;
}
export type EditableEntry = Entry & {
  _key: string;
};
export function EntryList({
  entries,
  onChange,
}: {
  entries: EditableEntry[];
  onChange: (entries: EditableEntry[]) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{
    entry: EditableEntry;
    index: number;
  } | null>(null);
  function edit(index: number, changes: Partial<Entry>) {
    onChange(
      entries.map((entry, i) =>
        i === index ? { ...entry, ...changes } : entry,
      ),
    );
  }
  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= entries.length || from === to) return;
    const next = [...entries];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    onChange(next);
  }
  const add = () =>
    onChange([
      ...entries,
      { _key: crypto.randomUUID(), name: "", url: "", icon: "lucide:link" },
    ]);
  return (
    <Card
      className="entry-list-section"
      title="菜单与联系入口"
      action={
        <Button size="small" onClick={add}>
          <Plus size={15} />
          添加入口
        </Button>
      }
    >
      {removed && (
        <Alert
          tone="neutral"
          action={
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                const next = [...entries];
                next.splice(
                  Math.min(removed.index, next.length),
                  0,
                  removed.entry,
                );
                onChange(next);
                setRemoved(null);
              }}
            >
              撤销
            </Button>
          }
        >
          已移除 {removed.entry.name || "入口"}
        </Alert>
      )}
      <div className="entry-list">
        {entries.map((entry, index) => (
          <div
            key={entry._key}
            className={
              "entry-row" +
              (dragging === entry._key ? " is-dragging" : "") +
              (target === entry._key && dragging !== entry._key
                ? " is-drop-target"
                : "")
            }
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              setTarget(entry._key);
            }}
            onDrop={(event) => {
              if (!dragging) return;
              event.preventDefault();
              move(
                entries.findIndex((item) => item._key === dragging),
                index,
              );
              setDragging(null);
              setTarget(null);
            }}
          >
            <div className="entry-handle">
              <IconButton
                size="small"
                label={"拖动排序 " + (entry.name || index + 1)}
                variant="ghost"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", entry._key);
                  event.dataTransfer.effectAllowed = "move";
                  setDragging(entry._key);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setTarget(null);
                }}
              >
                <GripVertical size={16} />
              </IconButton>
            </div>
            <div className="entry-icon-control">
              <IconPicker
                value={entry.icon}
                name={entry.name || String(index + 1)}
                onChange={(icon) => edit(index, { icon })}
              />
            </div>
            <div className="entry-name">
              <Input
                aria-label={"入口名称 " + (index + 1)}
                placeholder="名称"
                value={entry.name}
                onChange={(event) =>
                  edit(index, { name: event.currentTarget.value })
                }
              />
            </div>
            <div className="entry-url">
              <Input
                aria-label={"入口地址 " + (index + 1)}
                placeholder="https://… 或 mailto:…"
                value={entry.url}
                onChange={(event) =>
                  edit(index, { url: event.currentTarget.value })
                }
              />
            </div>
            <div className="entry-actions">
              <IconButton
                size="small"
                variant="ghost"
                label={"上移入口 " + (entry.name || index + 1)}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp size={15} />
              </IconButton>
              <IconButton
                size="small"
                variant="ghost"
                label={"下移入口 " + (entry.name || index + 1)}
                disabled={index === entries.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown size={15} />
              </IconButton>
              <IconButton
                size="small"
                variant="danger"
                label={"移除入口 " + (entry.name || index + 1)}
                onClick={() => {
                  setRemoved({ entry, index });
                  onChange(entries.filter((_, i) => i !== index));
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

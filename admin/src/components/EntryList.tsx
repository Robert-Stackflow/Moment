import { Button, IconButton, Input } from "@robert-stackflow/oneui";
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
  return (
    <section className="entry-list-section">
      <div
        className="ui-row"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h5 className="ui-title">菜单与联系入口</h5>
        <Button
          size="small"
          onClick={() =>
            onChange([
              ...entries,
              {
                _key: crypto.randomUUID(),
                name: "",
                url: "",
                icon: "lucide:link",
              },
            ])
          }
          variant="secondary"
        >
          {<Plus size={14} />}
          添加入口
        </Button>
      </div>
      {removed && (
        <div className="photo-undo">
          <span>已移除 {removed.entry.name || "入口"}</span>
          <Button
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
            variant="ghost"
          >
            撤销
          </Button>
        </div>
      )}
      {!!entries.length && (
        <div className="entry-list-header" aria-hidden="true">
          <span />
          <span>图标</span>
          <span>名称</span>
          <span>地址</span>
          <span>操作</span>
        </div>
      )}
      <div className="entry-list">
        {entries.map((entry, index) => (
          <div
            key={entry._key}
            className={`entry-row ${dragging === entry._key ? "is-dragging" : ""} ${target === entry._key && dragging !== entry._key ? "is-drop-target" : ""}`}
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
            <IconButton
              label={`拖动排序 ${entry.name || index + 1}`}
              variant="ghost"
              className="entry-drag"
              draggable
              aria-label={`拖动排序 ${entry.name || index + 1}`}
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
            <IconPicker
              value={entry.icon}
              name={entry.name || String(index + 1)}
              onChange={(icon) => edit(index, { icon })}
            />
            <Input
              className="entry-name"
              aria-label={`入口名称 ${index + 1}`}
              placeholder="名称"
              value={entry.name}
              onChange={(e) => edit(index, { name: e.currentTarget.value })}
            />
            <Input
              className="entry-url"
              aria-label={`入口地址 ${index + 1}`}
              placeholder="https://… 或 mailto:…"
              value={entry.url}
              onChange={(e) => edit(index, { url: e.currentTarget.value })}
            />
            <div className="entry-actions">
              <div className="entry-reorder">
                <IconButton
                  label={`上移入口 ${entry.name || index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  variant="ghost"
                >
                  <ArrowUp size={13} />
                </IconButton>
                <IconButton
                  label={`下移入口 ${entry.name || index + 1}`}
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, index + 1)}
                  variant="ghost"
                >
                  <ArrowDown size={13} />
                </IconButton>
              </div>
              <IconButton
                label={`移除入口 ${entry.name || index + 1}`}
                onClick={() => {
                  setRemoved({ entry, index });
                  onChange(entries.filter((_, i) => i !== index));
                }}
                variant="danger"
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      {!entries.length && <div className="entry-list-empty">暂无入口</div>}
    </section>
  );
}

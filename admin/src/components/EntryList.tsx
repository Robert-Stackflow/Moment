import { useState } from "react";
import { ActionIcon, Button, Group, TextInput, Title } from "@mantine/core";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { IconPicker } from "./IconPicker";

export interface Entry {
  name: string;
  icon: string;
  url: string;
  [key: string]: unknown;
}
export type EditableEntry = Entry & { _key: string };
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
      <Group justify="space-between" mb={20}>
        <Title order={5}>菜单与联系入口</Title>
        <Button
          size="xs"
          variant="light"
          leftSection={<Plus size={14} />}
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
        >
          添加入口
        </Button>
      </Group>
      {removed && (
        <div className="photo-undo">
          <span>已移除 {removed.entry.name || "入口"}</span>
          <Button
            size="compact-xs"
            variant="subtle"
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
            <button
              type="button"
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
            </button>
            <IconPicker
              value={entry.icon}
              name={entry.name || String(index + 1)}
              onChange={(icon) => edit(index, { icon })}
            />
            <TextInput
              className="entry-name"
              aria-label={`入口名称 ${index + 1}`}
              placeholder="名称"
              value={entry.name}
              onChange={(e) => edit(index, { name: e.currentTarget.value })}
            />
            <TextInput
              className="entry-url"
              aria-label={`入口地址 ${index + 1}`}
              placeholder="https://… 或 mailto:…"
              value={entry.url}
              onChange={(e) => edit(index, { url: e.currentTarget.value })}
            />
            <div className="entry-actions">
              <div className="entry-reorder">
                <ActionIcon
                  size={22}
                  variant="subtle"
                  color="gray"
                  aria-label={`上移入口 ${entry.name || index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp size={13} />
                </ActionIcon>
                <ActionIcon
                  size={22}
                  variant="subtle"
                  color="gray"
                  aria-label={`下移入口 ${entry.name || index + 1}`}
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown size={13} />
                </ActionIcon>
              </div>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`移除入口 ${entry.name || index + 1}`}
                onClick={() => {
                  setRemoved({ entry, index });
                  onChange(entries.filter((_, i) => i !== index));
                }}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </div>
          </div>
        ))}
      </div>
      {!entries.length && <div className="entry-list-empty">暂无入口</div>}
    </section>
  );
}

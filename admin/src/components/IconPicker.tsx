import { useState } from "react";
import { Button, Group, Popover, Text, TextInput } from "@mantine/core";
import { Check, Link2, Search } from "lucide-react";
import icons from "../../../shared/entry-icons.json";

export function EntryIcon({
  value,
  size = 20,
}: {
  value: string;
  size?: number;
}) {
  const legacyName = value.split(":").pop() || "";
  const previewName = legacyName === "blog" ? "book-open" : legacyName;
  const item =
    icons.find((icon) => icon.value === value) ||
    icons.find((icon) => icon.value === `lucide:${previewName}`);
  return item ? (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${item.icon.width} ${item.icon.height}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: item.icon.body }}
    />
  ) : (
    <Link2 size={size} />
  );
}

export function IconPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("全部");
  const current = icons.find((icon) => icon.value === value);
  const filtered = icons.filter(
    (icon) =>
      (group === "全部" || icon.group === group) &&
      `${icon.name} ${icon.value}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={352}
      position="bottom-start"
      offset={9}
      trapFocus
      returnFocus
      withinPortal
      middlewares={{ flip: true, shift: { padding: 12, crossAxis: true } }}
      transitionProps={{ transition: "pop-top-left", duration: 170 }}
    >
      <Popover.Target>
        <button
          type="button"
          className="entry-icon-trigger"
          aria-label={`选择图标 ${name}`}
          data-tooltip={
            current?.name || (value ? `原有图标：${value}` : "选择图标")
          }
          onClick={() => {
            setSearch("");
            setGroup("全部");
            setOpened(!opened);
          }}
        >
          <EntryIcon value={value} />
        </button>
      </Popover.Target>
      <Popover.Dropdown className="icon-picker" aria-label="Lucide 图标选择器">
        <Group justify="space-between" mb={12}>
          <Text size="sm" fw={600}>
            选择图标
          </Text>
          <Text size="xs" c="dimmed">
            Lucide
          </Text>
        </Group>
        <TextInput
          aria-label="搜索图标"
          placeholder="搜索名称，如 邮件 / mail"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          data-autofocus
        />
        <div className="icon-groups" role="group" aria-label="图标分类">
          {["全部", "常用", "联系", "媒体", "内容", "开发"].map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={group === item}
              onClick={() => setGroup(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="icon-picker-grid" role="group" aria-label="可选图标">
          {filtered.map((item) => (
            <button
              type="button"
              key={item.value}
              aria-label={item.name}
              data-tooltip={`${item.name} · ${item.value.slice(7)}`}
              aria-pressed={value === item.value}
              onClick={() => {
                onChange(item.value);
                setOpened(false);
              }}
            >
              <EntryIcon value={item.value} size={21} />
              {value === item.value && (
                <Check className="icon-picked" size={10} />
              )}
            </button>
          ))}
          {!filtered.length && (
            <Text size="xs" c="dimmed" className="icon-picker-empty">
              没有匹配的图标
            </Text>
          )}
        </div>
        <div className="icon-picker-footer">
          <Text size="xs" c="dimmed">
            {current?.name || (value ? "保留原有图标，选择后替换" : "尚未选择")}
          </Text>
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            onClick={() => setOpened(false)}
          >
            取消
          </Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

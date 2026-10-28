import {
  FormField,
  TreeSelect,
  type HierarchyOption,
} from "@robert-stackflow/oneui";
import { Folder, Tag } from "lucide-react";
import type { Category } from "../types";
function options(categories: Category[]): HierarchyOption[] {
  return categories.map((item) => ({
    value: String(item.id),
    label: item.name,
    icon: item.children?.length ? <Folder /> : <Tag />,
    count: item.children?.length,
    children: item.children?.length ? options(item.children) : undefined,
  }));
}
function expanded(categories: Category[]): string[] {
  return categories.flatMap((item) =>
    item.children?.length ? [String(item.id), ...expanded(item.children)] : [],
  );
}
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange(value: string | null): void;
}) {
  return (
    <TreeSelect
      variant="category"
      label="分类筛选"
      options={options(categories)}
      value={value || ""}
      onChange={(value) => onChange(value || null)}
      defaultExpanded={expanded(categories)}
      placeholder="全部分类"
      icon={<Folder />}
    />
  );
}
export function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string[];
  onChange(value: string[]): void;
}) {
  return (
    <FormField label="分类">
      <TreeSelect
        multiple
        checkStrictly
        variant="category"
        label="分类"
        options={options(categories)}
        value={value}
        onChange={onChange}
        defaultExpanded={expanded(categories)}
        placeholder="选择分类"
        icon={<Folder />}
      />
    </FormField>
  );
}

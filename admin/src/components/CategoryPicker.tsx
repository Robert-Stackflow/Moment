import { useId, useState } from "react";
import { Combobox, useCombobox } from "@mantine/core";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderTree,
  Search,
  Tag,
  X,
} from "lucide-react";
import { flatten } from "../types";
import type { Category } from "../types";

function categoryOptions(categories: Category[]) {
  const rows = flatten(categories);
  const byID = new Map(rows.map((item) => [item.id, item]));
  return rows.map((item) => ({
    value: String(item.id),
    name: item.name,
    parent: item.parent_id ? byID.get(item.parent_id)?.name || "" : "",
    child: !!item.parent_id,
    children: item.children?.length || 0,
  }));
}
type Option = ReturnType<typeof categoryOptions>[number];
function CategoryPath({ item }: { item: Option }) {
  return (
    <span className="category-value-path">
      {item.parent && (
        <>
          <span className="category-path-parent">{item.parent}</span>
          <ChevronRight size={12} />
        </>
      )}
      <span className="category-path-leaf">{item.name}</span>
    </span>
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
  multiple = false,
}: {
  categories: Category[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const data = categoryOptions(categories);
  const selected = value
    .map((value) => data.find((item) => item.value === value))
    .filter((item): item is Option => !!item);
  const matches = (item: Option) =>
    `${item.parent} ${item.name}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  const filtered = data.filter(
    (item) =>
      matches(item) ||
      (!item.child &&
        data.some((child) => child.parent === item.name && matches(child))),
  );
  const store = useCombobox({
    onDropdownOpen: () => {
      store.focusSearchInput();
    },
    onDropdownClose: (source) => {
      store.resetSelectedOption();
      setSearch("");
      if (source === "keyboard") store.focusTarget();
    },
  });
  const remove = (id: string) => onChange(value.filter((item) => item !== id));
  const single = selected[0];
  return (
    <div className={multiple ? "category-multi-field" : "category-filter"}>
      {multiple && (
        <div className="category-field-label">
          <label id={`${id}-label`} htmlFor={id}>
            分类
            {value.length > 0 && (
              <span className="category-selected-count">{value.length}</span>
            )}
          </label>
          {value.length > 0 && (
            <button
              type="button"
              className="category-clear-all"
              onClick={() => onChange([])}
            >
              清空
            </button>
          )}
        </div>
      )}
      <Combobox
        store={store}
        position="bottom-start"
        width="target"
        withinPortal
        onOptionSubmit={(next) => {
          if (multiple) {
            onChange(
              value.includes(next)
                ? value.filter((item) => item !== next)
                : [...value, next],
            );
            store.focusSearchInput();
          } else {
            onChange([next]);
            store.closeDropdown();
            store.focusTarget();
          }
        }}
        transitionProps={{ transition: "fade", duration: 150 }}
        middlewares={{
          flip: { padding: 12 },
          shift: { padding: 12 },
          size: { padding: 12 },
        }}
        classNames={{ dropdown: "category-menu" }}
      >
        <Combobox.DropdownTarget>
          <div
            className={`category-control ${multiple ? "is-multiple" : ""} ${value.length ? "has-value" : ""} ${store.dropdownOpened ? "is-open" : ""}`}
          >
            <Combobox.EventsTarget targetType="button" withExpandedAttribute>
              <button
                id={id}
                type="button"
                className="category-trigger"
                aria-label={multiple ? "选择分类" : "按分类筛选"}
                onClick={() => store.toggleDropdown()}
              >
                <span className="category-trigger-symbol">
                  {multiple ? <FolderTree size={17} /> : <Folder size={17} />}
                </span>
                {multiple ? (
                  <span className="category-trigger-placeholder">
                    {value.length ? "添加或调整分类" : "选择分类"}
                  </span>
                ) : single ? (
                  <CategoryPath item={single} />
                ) : (
                  <span className="category-trigger-placeholder">全部分类</span>
                )}
                <ChevronDown className="category-trigger-chevron" size={15} />
              </button>
            </Combobox.EventsTarget>
            {!multiple && value.length > 0 && (
              <button
                type="button"
                className="category-clear-single"
                aria-label="清除分类筛选"
                onClick={() => onChange([])}
              >
                <X size={13} />
              </button>
            )}
            {multiple && !!selected.length && (
              <div className="category-selected-tags">
                {selected.map((item) => (
                  <span className="category-selected-tag" key={item.value}>
                    {item.child ? (
                      <Tag size={12} className="category-tag-icon" />
                    ) : (
                      <Folder size={12} className="category-tag-icon" />
                    )}
                    <CategoryPath item={item} />
                    <button
                      type="button"
                      aria-label={`移除分类 ${item.parent ? `${item.parent} / ` : ""}${item.name}`}
                      onClick={() => remove(item.value)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Combobox.DropdownTarget>
        <Combobox.Dropdown>
          <Combobox.Search
            placeholder="搜索分类…"
            aria-label="搜索分类"
            value={search}
            leftSection={<Search size={15} />}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              store.resetSelectedOption();
            }}
          />
          <Combobox.Options
            className="category-menu-options"
            aria-label="分类选项"
            aria-multiselectable={multiple || undefined}
          >
            {filtered.map((item) => (
              <Combobox.Option
                value={item.value}
                key={item.value}
                active={value.includes(item.value)}
                aria-selected={value.includes(item.value)}
                className={`${item.child ? "is-child" : "is-parent"} ${value.includes(item.value) ? "is-picked" : ""}`}
              >
                <div className="category-menu-row">
                  <span className="category-menu-symbol">
                    {item.child ? <Tag size={15} /> : <Folder size={17} />}
                  </span>
                  <span className="category-menu-name">{item.name}</span>
                  {!item.child && item.children > 0 && (
                    <span className="category-menu-count">{item.children}</span>
                  )}
                  <span
                    className={`category-option-mark ${multiple ? "is-checkbox" : "is-radio"}`}
                    aria-hidden="true"
                  >
                    {value.includes(item.value) &&
                      (multiple ? (
                        <Check size={11} strokeWidth={2.7} />
                      ) : (
                        <span />
                      ))}
                  </span>
                </div>
              </Combobox.Option>
            ))}
            {!filtered.length && (
              <Combobox.Empty>没有匹配的分类</Combobox.Empty>
            )}
          </Combobox.Options>
          {multiple && (
            <Combobox.Footer>
              <span>已选 {value.length} 项</span>
              <button
                type="button"
                onClick={() => {
                  store.closeDropdown();
                  store.focusTarget();
                }}
              >
                完成
                <Check size={12} />
              </button>
            </Combobox.Footer>
          )}
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
}
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <CategoryPicker
      categories={categories}
      value={value ? [value] : []}
      onChange={(values) => onChange(values[0] || null)}
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
  onChange: (value: string[]) => void;
}) {
  return (
    <CategoryPicker
      multiple
      categories={categories}
      value={value}
      onChange={onChange}
    />
  );
}

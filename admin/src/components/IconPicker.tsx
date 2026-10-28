import {
  FormField,
  IconPicker as SharedIconPicker,
} from "@robert-stackflow/oneui";
import { Link2 } from "lucide-react";
import icons from "../../../shared/entry-icons.json";
export function EntryIcon({
  value,
  size = 20,
}: {
  value: string;
  size?: number;
}) {
  const legacyName = value.split(":").pop() || "",
    name = legacyName === "blog" ? "book-open" : legacyName;
  const item =
    icons.find((icon) => icon.value === value) ||
    icons.find((icon) => icon.value === "lucide:" + name);
  return item ? (
    <svg
      width={size}
      height={size}
      viewBox={"0 0 " + item.icon.width + " " + item.icon.height}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: item.icon.body }}
    />
  ) : (
    <Link2 size={size} />
  );
}
const options = icons.map((item) => ({
  value: item.value,
  label: item.name,
  category: item.group,
  keywords: [item.value],
  icon: <EntryIcon value={item.value} />,
}));
export function IconPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange(value: string): void;
  name: string;
}) {
  return (
    <FormField label={name}>
      <SharedIconPicker value={value} onChange={onChange} options={options} />
    </FormField>
  );
}

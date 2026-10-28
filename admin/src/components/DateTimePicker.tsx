import { DatePicker, FormField } from "@robert-stackflow/oneui";
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
  onChange(value: string): void;
  placeholder?: string;
  timeZone?: string;
}) {
  return (
    <FormField label={label} hint={description}>
      <DatePicker
        label={label}
        mode="datetime"
        seconds
        clearable
        timeZone={timeZone}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </FormField>
  );
}

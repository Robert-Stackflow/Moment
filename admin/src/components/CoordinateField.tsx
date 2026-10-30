import { Input } from "@robert-stackflow/oneui";
import { useEffect, useState } from "react";
export function CoordinateField({
  label,
  limit,
  value,
  onChange,
}: {
  label: string;
  limit: number;
  value: number | null;
  onChange(value: number | null): void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [error, setError] = useState("");
  useEffect(() => {
    setText((current) =>
      value !== null && current.trim() && Object.is(Number(current), value)
        ? current
        : value === null
          ? ""
          : String(value),
    );
    setError("");
  }, [value]);
  const valid = (text: string) =>
    /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Math.abs(Number(text)) <= limit;
  return (
    <Input
      label={label}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="未设置"
      value={text}
      error={error}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        setError("");
        if (!next.trim()) onChange(null);
        else if (valid(next)) onChange(Number(next));
      }}
      onBlur={() => {
        if (text.trim() && !valid(text)) {
          setText(value === null ? "" : String(value));
          setError(`请输入 -${limit} 至 ${limit} 的小数`);
        }
      }}
    />
  );
}

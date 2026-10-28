import { Switch } from "@robert-stackflow/oneui";
import type { ReactNode } from "react";
type ToggleProps = {
  label?: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-busy"?: boolean;
};
export function Toggle({
  label,
  description,
  className = "",
  checked,
  onChange,
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-busy": busy,
}: ToggleProps) {
  return (
    <div className={"toggle-row " + className} id={id} aria-busy={busy}>
      {label && (
        <span>
          <span>{label}</span>
          {description && <small>{description}</small>}
        </span>
      )}
      <span aria-labelledby={labelledBy}>
        <Switch
          label={
            typeof label === "string" ? label : ariaLabel || name || "开关"
          }
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
      </span>
    </div>
  );
}

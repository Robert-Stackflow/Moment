import type { InputHTMLAttributes, ReactNode } from "react";
import { Check, Minus } from "lucide-react";

type ToggleProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & { label?: ReactNode; description?: ReactNode };
export function Toggle({
  label,
  description,
  className = "",
  ...props
}: ToggleProps) {
  return (
    <label
      className={`moment-toggle ${className} ${props.disabled ? "is-disabled" : ""}`}
    >
      <span className="toggle-control">
        <input {...props} type="checkbox" role="switch" />
        <span className="toggle-track" aria-hidden="true">
          <Check className="toggle-on" size={12} />
          <Minus className="toggle-off" size={12} />
          <span className="toggle-thumb" />
        </span>
      </span>
      {label && (
        <span className="toggle-copy">
          <span>{label}</span>
          {description && <small>{description}</small>}
        </span>
      )}
    </label>
  );
}

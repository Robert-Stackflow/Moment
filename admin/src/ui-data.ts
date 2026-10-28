import type { CSSProperties, ReactNode } from "react";
export function selectOptions(
  values: readonly (
    | string
    | { value: string; label: string; disabled?: boolean }
  )[] = [],
) {
  return values.map((value) =>
    typeof value === "string" ? { value, label: value } : value,
  );
}
export function segmentOptions(
  values: readonly (
    | string
    | { value: string; label: ReactNode; disabled?: boolean }
  )[],
) {
  return values.map((value) =>
    typeof value === "string" ? { value, label: value } : value,
  );
}
export function tone(
  color?: string,
): "neutral" | "success" | "warning" | "danger" {
  return color === "red"
    ? "danger"
    : color === "green" || color === "teal"
      ? "success"
      : ["yellow", "orange"].includes(color || "")
        ? "warning"
        : "neutral";
}
export const adminHref = (path: string) =>
  "/admin" + (path.startsWith("/") ? path : "/" + path);
export function gridStyle(
  columns:
    | number
    | {
        base?: number;
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
      },
  gap: number | string,
): CSSProperties {
  const result: Record<string, number | string> = { gap };
  let count = typeof columns === "number" ? columns : columns.base || 1;
  for (const breakpoint of ["base", "xs", "sm", "md", "lg", "xl"] as const) {
    if (typeof columns !== "number") count = columns[breakpoint] ?? count;
    result["--grid-" + breakpoint] = count;
  }
  return result as CSSProperties;
}

export const badgeTone = (color?: string) =>
  ["victoria", "blue", "indigo"].includes(color || "")
    ? ("accent" as const)
    : tone(color);

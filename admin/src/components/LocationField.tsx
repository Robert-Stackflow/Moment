import { Combobox, FormField } from "@robert-stackflow/oneui";
import { useRef } from "react";
import {
  locationSuggestions,
  type MapPlace,
} from "../../../shared/map/amap-services";
export function LocationField({
  label = "拍摄地点",
  value,
  latitude = null,
  longitude = null,
  allowCustom = true,
  clearable = true,
  placeholder = "输入地点，或选择候选",
  disabled = false,
  onChange,
  onPlace,
}: {
  label?: string;
  value: string;
  latitude?: number | null;
  longitude?: number | null;
  allowCustom?: boolean;
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onChange?(value: string): void;
  onPlace(place: MapPlace): void;
}) {
  const candidates = useRef<Map<string, MapPlace>>(new Map());
  return (
    <FormField label={label}>
      <Combobox
        label={label}
        mode="input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        allowCustomValue={allowCustom}
        loadOptions={async (query, signal) => {
          const point =
            latitude !== null && longitude !== null
              ? { latitude, longitude }
              : null;
          const places = await locationSuggestions(query, point, signal);
          if (signal.aborted) return [];
          candidates.current = new Map(
            places.map((place) => [place.id, place]),
          );
          return [
            ...(!query.trim() && value && clearable
              ? [{ value: "__moment_clear_location__", label: "不设置地点" }]
              : []),
            ...places.map((place) => ({
              value: place.id,
              label: place.label,
              description: place.description,
            })),
          ];
        }}
        onChange={(value, option) => {
          if (!option) {
            onChange?.(value);
            return;
          }
          if (value === "__moment_clear_location__") {
            onChange?.("");
            return;
          }
          const place = candidates.current.get(value);
          if (place) onPlace(place);
          else onChange?.(value);
        }}
      />
    </FormField>
  );
}

export interface MapPlace {
  id: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
}
export interface MapConfig {
  provider: string;
  key: string;
  serviceHost: string;
  style: string;
}
export interface PickerMap {
  show(latitude: number, longitude: number, center?: boolean): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
}
export function getMapConfig(): Promise<MapConfig>;
export function nearbyPlaces(
  latitude: number,
  longitude: number,
): Promise<MapPlace[]>;
export function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<MapPlace[]>;
export function createPickerMap(
  host: HTMLElement,
  config: MapConfig,
  initial: [number, number] | null,
  onPoint: (latitude: number, longitude: number) => void,
): Promise<PickerMap>;

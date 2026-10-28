import {
  ThemeProvider,
  type ColorMode,
} from "@robert-stackflow/oneui/ThemeProvider";
import { createContext, useContext, useState, type ReactNode } from "react";
const Context = createContext<{
  mode: ColorMode;
  setMode(mode: ColorMode): void;
}>({ mode: "light", setMode: () => {} });
const key = "moment.admin.color-mode";
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setValue] = useState<ColorMode>(() => {
    try {
      const stored =
        localStorage.getItem(key) ||
        localStorage.getItem("mantine-color-scheme-value");
      return stored === "dark"
        ? "dark"
        : stored === "auto" || stored === "system"
          ? "system"
          : "light";
    } catch {
      return "light";
    }
  });
  const setMode = (next: ColorMode) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {}
  };
  return (
    <Context value={{ mode, setMode }}>
      <ThemeProvider theme="blue" mode={mode}>
        {children}
      </ThemeProvider>
    </Context>
  );
}
export const useAppearance = () => useContext(Context);

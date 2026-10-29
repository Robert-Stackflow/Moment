import { useCallback, useEffect, useRef, useState } from "react";
// Conditional panels unmount instead of sending open=false to the shared surface.
// Restore their trigger after removal, without stealing focus from another modal.
export function useRestoreFocusOnUnmount() {
  const opener = useRef(
    document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    return () => {
      requestAnimationFrame(() => {
        const target = opener.current;
        const modal = [...document.querySelectorAll("dialog:modal")].at(-1);
        if (
          target?.isConnected &&
          !target.matches(":disabled") &&
          (!modal || modal.contains(target))
        )
          target.focus({ preventScroll: true });
      });
    };
  }, []);
}
export function useDebouncedValue<T>(value: T, delay: number) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return [result] as const;
}
export function useDisclosure(initial = false) {
  const [opened, setOpened] = useState(initial);
  return [
    opened,
    {
      open: useCallback(() => setOpened(true), []),
      close: useCallback(() => setOpened(false), []),
      toggle: useCallback(() => setOpened((value) => !value), []),
    },
  ] as const;
}
export function useInterval(
  callback: () => void,
  delay: number,
  options?: { autoInvoke?: boolean },
) {
  const [active, setActive] = useState(options?.autoInvoke || false),
    latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => latest.current(), delay);
    return () => clearInterval(timer);
  }, [active, delay]);
  return {
    active,
    start: useCallback(() => setActive(true), []),
    stop: useCallback(() => setActive(false), []),
    toggle: useCallback(() => setActive((value) => !value), []),
  };
}

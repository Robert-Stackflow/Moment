import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Portal } from "@mantine/core";

// One tooltip policy also covers controls rendered by the component library.
export function ControlTooltips() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [label, setLabel] = useState("");
  const [opened, setOpened] = useState(false);
  const active = useRef<HTMLElement | null>(null);
  useControlEvents(setTarget, setLabel, setOpened, active);
  return target ? (
    <Portal>
      <TooltipBubble target={target} label={label} opened={opened} />
    </Portal>
  ) : null;
}

function TooltipBubble({
  target,
  label,
  opened,
}: {
  target: HTMLElement;
  label: string;
  opened: boolean;
}) {
  const bubble = useRef<HTMLDivElement>(null);
  const tooltipID = useId();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    arrow: 0,
    above: true,
  });
  useLayoutEffect(() => {
    setVisible(false);
    if (!opened || !target || !bubble.current) return;
    const anchor = target.getBoundingClientRect();
    const bounds = bubble.current.getBoundingClientRect();
    const center = anchor.left + anchor.width / 2;
    const left = Math.min(
      Math.max(8, center - bounds.width / 2),
      window.innerWidth - bounds.width - 8,
    );
    const above = anchor.top - bounds.height - 10 >= 8;
    const top = above ? anchor.top - bounds.height - 10 : anchor.bottom + 10;
    setPosition({
      left,
      top,
      above,
      arrow: Math.max(12, Math.min(bounds.width - 12, center - left)),
    });
    const previous = target.getAttribute("aria-describedby");
    target.setAttribute(
      "aria-describedby",
      [previous, tooltipID].filter(Boolean).join(" "),
    );
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      if (previous) target.setAttribute("aria-describedby", previous);
      else target.removeAttribute("aria-describedby");
    };
  }, [target, label, opened, tooltipID]);
  return (
    <div
      ref={bubble}
      id={tooltipID}
      role="tooltip"
      aria-hidden={!visible}
      className="control-tooltip"
      data-visible={visible || undefined}
      style={{ left: position.left, top: position.top }}
    >
      {label}
      <span
        className="control-tooltip-pointer"
        data-below={!position.above || undefined}
        style={{ left: position.arrow }}
      />
    </div>
  );
}

function useControlEvents(
  setTarget: (target: HTMLElement) => void,
  setLabel: (label: string) => void,
  setOpened: (opened: boolean) => void,
  active: React.MutableRefObject<HTMLElement | null>,
) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function hide() {
      clearTimeout(timer);
      active.current = null;
      setOpened(false);
    }
    function resolve(event: Event) {
      if (!(event.target instanceof Element)) return null;
      const element = event.target.closest<HTMLElement>(
        "[data-tooltip],button,a,[role=button]",
      );
      if (
        !element ||
        (!element.dataset.tooltip &&
          (element.textContent?.trim() || !element.querySelector("svg")))
      )
        return null;
      return element;
    }
    function show(event: Event) {
      if (event instanceof PointerEvent && event.pointerType === "touch")
        return;
      const element = resolve(event);
      if (!element) {
        hide();
        return;
      }
      if (event.type === "focusin" && !element.matches(":focus-visible"))
        return;
      const text =
        element.dataset.tooltip || element.getAttribute("aria-label") || "";
      if (!text || active.current === element) return;
      hide();
      active.current = element;
      timer = setTimeout(
        () => {
          if (element.isConnected) {
            setTarget(element);
            setLabel(text);
            setOpened(true);
          }
        },
        event.type === "focusin" ? 100 : 360,
      );
    }
    function leave(event: Event) {
      const next = (event as PointerEvent).relatedTarget;
      if (next instanceof Node && active.current?.contains(next)) return;
      hide();
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    document.addEventListener("pointerover", show);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", show);
    document.addEventListener("focusout", leave);
    document.addEventListener("pointerdown", hide);
    document.addEventListener("scroll", hide, true);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", show);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", show);
      document.removeEventListener("focusout", leave);
      document.removeEventListener("pointerdown", hide);
      document.removeEventListener("scroll", hide, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", hide);
    };
  }, []);
}

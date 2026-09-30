import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Group, Modal, Text } from "@mantine/core";

const PendingContext = createContext<
  ((id: string, pending: boolean) => void) | null
>(null);

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  const sources = useRef(new Set<string>());
  const allowRefresh = useRef(false);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const register = useCallback((id: string, pending: boolean) => {
    if (pending) sources.current.add(id);
    else sources.current.delete(id);
  }, []);

  useLayoutEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (allowRefresh.current || sources.current.size === 0) return;
      event.preventDefault();
      // Non-empty returnValue also supports hosts that only check the legacy signal.
      event.returnValue = "当前修改尚未保存。";
    };
    const refresh = (event: KeyboardEvent) => {
      if (sources.current.size === 0 || event.altKey) return;
      if (
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r")
      ) {
        event.preventDefault();
        event.stopPropagation();
        setRefreshRequested(true);
      }
    };
    window.addEventListener("beforeunload", warn, true);
    window.addEventListener("keydown", refresh, true);
    return () => {
      window.removeEventListener("beforeunload", warn, true);
      window.removeEventListener("keydown", refresh, true);
    };
  }, []);

  return (
    <PendingContext.Provider value={register}>
      {children}
      <Modal
        opened={refreshRequested}
        onClose={() => setRefreshRequested(false)}
        title="刷新当前页面？"
        centered
        zIndex={500}
      >
        <Text size="sm">
          当前修改尚未保存，刷新会丢失这些修改，并中断正在进行的上传。
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            onClick={() => setRefreshRequested(false)}
            data-autofocus
          >
            继续编辑
          </Button>
          <Button
            color="red"
            onClick={() => {
              allowRefresh.current = true;
              window.location.reload();
            }}
          >
            放弃修改并刷新
          </Button>
        </Group>
      </Modal>
    </PendingContext.Provider>
  );
}

export function usePendingChanges(pending: boolean) {
  const register = useContext(PendingContext);
  const id = useId();
  if (!register) throw new Error("Pending changes provider missing");
  useLayoutEffect(() => {
    register(id, pending);
    return () => register(id, false);
  }, [register, id, pending]);
}

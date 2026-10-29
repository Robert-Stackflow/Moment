import { Button, Menu } from "@robert-stackflow/oneui";
import { History } from "lucide-react";
import {
  Suspense,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { Loading, PageTitle } from "./Common";
import { OrganizeTabs } from "./OrganizeTabs";
import { PhotoHistory } from "./PhotoHistory";

export type OrganizeTool = ComponentProps<typeof Menu>["items"][number];
type OrganizeContext = {
  setHistoryDisabled(disabled: boolean): void;
  setTools(tools: OrganizeTool[]): void;
};

export function useOrganizeTools(tools: OrganizeTool[], disabled = false) {
  const { setHistoryDisabled, setTools } = useOutletContext<OrganizeContext>();
  useLayoutEffect(() => {
    setHistoryDisabled(disabled);
    setTools(tools);
    return () => {
      setHistoryDisabled(false);
      setTools([]);
    };
  }, [disabled, tools, setHistoryDisabled, setTools]);
}

export function OrganizeLayout() {
  const [history, setHistory] = useState(false);
  const [historyDisabled, setHistoryDisabled] = useState(false);
  const [tools, setTools] = useState<OrganizeTool[]>([]);
  return (
    <>
      <PageTitle title="照片整理">
        <div className="ui-row">
          <Button
            onClick={() => setHistory(true)}
            disabled={historyDisabled}
            variant="secondary"
          >
            <History size={16} />
            处理记录
          </Button>
          {!!tools.length && <Menu label="更多" items={tools} />}
        </div>
      </PageTitle>
      <OrganizeTabs />
      <Suspense fallback={<Loading />}>
        <Outlet context={{ setHistoryDisabled, setTools }} />
      </Suspense>
      {history && <PhotoHistory onClose={() => setHistory(false)} />}
    </>
  );
}

import {
  Alert,
  Button,
  LoadingState,
  Placeholder,
} from "@robert-stackflow/oneui";
import type { ReactNode } from "react";
import { ApiError } from "../api";
import { useAuth } from "../session";
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function Loading() {
  return <LoadingState label="加载数据" showLabel={false} fullPage />;
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => unknown;
}) {
  const auth = useAuth();
  return (
    <Alert
      tone="danger"
      title="暂时无法显示内容"
      action={
        <Button
          variant="secondary"
          onClick={() => {
            if (error instanceof ApiError && error.status === 401)
              void auth.refresh();
            else retry();
          }}
        >
          重试
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
export function Empty({
  title = "还没有内容",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Placeholder title={title} description={description}>
      {children}
    </Placeholder>
  );
}

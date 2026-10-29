import {
  Button,
  Dialog,
  Pagination,
  EmptyState,
} from "@robert-stackflow/oneui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
export function RecordDialog({
  title,
  icon: Icon,
  total = 0,
  page,
  pageSize,
  onPageChange,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  total?: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={true}
      onClose={() => !busy && onClose()}
      size="medium"
      busy={busy}
      title={title}
      footer={
        <>
          {total > pageSize && (
            <Pagination
              compact
              size="small"
              page={page}
              onPageChange={onPageChange}
              total={total}
              pageSize={pageSize}
            />
          )}
          <Button disabled={busy} onClick={onClose} variant="secondary">
            关闭
          </Button>
        </>
      }
      variant="default"
    >
      <div className="record-dialog-scroll" key={page}>
        {children}
      </div>
    </Dialog>
  );
}
export function RecordEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div role="status">
      <EmptyState
        icon={<Icon size={26} />}
        title={title}
        description={description}
      />
    </div>
  );
}

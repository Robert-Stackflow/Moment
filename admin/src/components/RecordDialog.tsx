import { Button, Dialog, Pagination } from "@robert-stackflow/oneui";
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
    >
      <div className="record-dialog-scroll" key={page}>
        {children}
      </div>
      <div className="record-dialog-footer">
        {total > pageSize && (
          <Pagination
            page={page}
            onPageChange={onPageChange}
            total={Math.ceil(total / pageSize)}
            pageSize={1}
            summary={null}
          />
        )}
        <Button disabled={busy} onClick={onClose} variant="secondary">
          关闭
        </Button>
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
    <div className="record-empty" role="status">
      <span className="record-empty-icon" aria-hidden="true">
        <Icon size={27} strokeWidth={1.6} />
      </span>
      <p
        className="ui-text"
        style={{
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          className="ui-text"
          style={{
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { Badge, Button, Modal, Pagination, Text } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

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
    <Modal
      opened
      onClose={() => !busy && onClose()}
      size={620}
      centered
      padding={0}
      closeOnEscape={!busy}
      closeOnClickOutside={!busy}
      title={
        <div className="record-dialog-heading">
          <Icon size={19} aria-hidden="true" />
          <Text fw={600}>{title}</Text>
          {total > 0 && (
            <Badge variant="light" size="sm">
              {total}
            </Badge>
          )}
        </div>
      }
      classNames={{
        content: "record-dialog",
        header: "record-dialog-header",
        body: "record-dialog-body",
      }}
    >
      <div className="record-dialog-scroll" key={page}>
        {children}
      </div>
      <div className="record-dialog-footer">
        {total > pageSize && (
          <Pagination
            size="sm"
            siblings={0}
            value={page}
            onChange={onPageChange}
            total={Math.ceil(total / pageSize)}
          />
        )}
        <Button variant="default" disabled={busy} onClick={onClose}>
          关闭
        </Button>
      </div>
    </Modal>
  );
}

export function RecordEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="record-empty" role="status">
      <span className="record-empty-icon" aria-hidden="true">
        <Icon size={27} strokeWidth={1.6} />
      </span>
      <Text fw={600} size="md">
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </div>
  );
}

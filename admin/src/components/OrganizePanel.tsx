import { Card } from "@robert-stackflow/oneui";
import type { ReactNode } from "react";

export function OrganizePanel({
  title,
  description,
  actions,
  filters,
  summary,
  footerActions,
  children,
}: {
  title: string;
  description: ReactNode;
  actions: ReactNode;
  filters?: ReactNode;
  summary?: ReactNode;
  footerActions?: ReactNode;
  children?: ReactNode;
}) {
  const content = filters || summary || footerActions || children;
  return (
    <Card
      className="moment-panel organize-panel"
      title={title}
      description={description}
      action={actions}
    >
      {content ? (
        <div className="organize-controls">
          {filters && <div className="organize-filters">{filters}</div>}
          {(summary || footerActions) && (
            <div className="organize-resultbar">
              <div className="organize-summary">{summary}</div>
              <div className="organize-tools">{footerActions}</div>
            </div>
          )}
          {children}
        </div>
      ) : undefined}
    </Card>
  );
}

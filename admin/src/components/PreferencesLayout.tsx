import { SideBar, Select, type NavigationGroup } from "@robert-stackflow/oneui";
import type { ReactNode } from "react";
export function PreferencesLayout({
  label,
  active,
  groups,
  onNavigate,
  children,
}: {
  label: string;
  active: string;
  groups: readonly NavigationGroup[];
  onNavigate(path: string): void;
  children: ReactNode;
}) {
  return (
    <div className="preferences-layout">
      <aside className="preferences-navigation">
        <SideBar
          variant="card"
          label={label}
          groups={groups}
          active={active}
          basePath="/admin"
          onNavigate={onNavigate}
        />
      </aside>
      <div className="preferences-mobile-navigation">
        <Select
          label={label}
          value={active}
          onChange={onNavigate}
          options={groups.flatMap((group) =>
            group.items.map((item) => ({
              value: item.path,
              label: item.label,
              icon: item.icon,
            })),
          )}
        />
      </div>
      <div className="preferences-content">{children}</div>
    </div>
  );
}

import { NavLink } from "react-router-dom";
import { ScanSearch, Tags } from "lucide-react";

export function OrganizeTabs() {
  return (
    <nav className="organize-tabs" aria-label="照片整理方式">
      <NavLink to="/organize/duplicates">
        <ScanSearch size={16} />
        重复图片
      </NavLink>
      <NavLink to="/organize/tags">
        <Tags size={16} />
        智能标签
      </NavLink>
    </nav>
  );
}

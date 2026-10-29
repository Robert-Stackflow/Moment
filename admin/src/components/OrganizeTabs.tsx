import { Segmented } from "@robert-stackflow/oneui";
import { ScanSearch, Tags } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
export function OrganizeTabs() {
  const { pathname } = useLocation(),
    navigate = useNavigate();
  return (
    <div className="organize-navigation">
      <Segmented
        label="照片整理方式"
        value={pathname.includes("/tags") ? "tags" : "duplicates"}
        onChange={(value) => navigate("/organize/" + value)}
        options={[
          {
            value: "duplicates",
            label: (
              <span className="tab-label">
                <ScanSearch size={16} />
                重复图片
              </span>
            ),
          },
          {
            value: "tags",
            label: (
              <span className="tab-label">
                <Tags size={16} />
                智能标签
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

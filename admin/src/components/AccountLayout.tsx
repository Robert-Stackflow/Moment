import { SettingsLayout } from "@robert-stackflow/oneui";
import { Fingerprint, KeyRound, Monitor, UserRound } from "lucide-react";
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loading, PageTitle } from "./Common";
const sections = [
  { value: "/account", label: "账户资料", icon: <UserRound /> },
  { value: "/account/security", label: "登录安全", icon: <Fingerprint /> },
  { value: "/account/password", label: "修改密码", icon: <KeyRound /> },
  { value: "/account/sessions", label: "登录会话", icon: <Monitor /> },
];
export default function AccountLayout() {
  const { pathname } = useLocation(),
    navigate = useNavigate();
  return (
    <>
      <PageTitle title="我的账户" />
      <SettingsLayout
        value={pathname.replace(/\/$/, "")}
        onChange={navigate}
        groups={[{ id: "account", items: sections }]}
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </SettingsLayout>
    </>
  );
}

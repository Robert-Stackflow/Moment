import { PreferencesLayout } from "./PreferencesLayout";
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
      <PreferencesLayout
        label="账户设置导航"
        active={pathname.replace(/\/$/, "")}
        onNavigate={navigate}
        groups={[
          {
            id: "profile",
            items: sections
              .slice(0, 1)
              .map((item) => ({ ...item, id: item.value, path: item.value })),
          },
          {
            id: "security",
            label: "安全",
            items: sections
              .slice(1)
              .map((item) => ({ ...item, id: item.value, path: item.value })),
          },
        ]}
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </PreferencesLayout>
    </>
  );
}

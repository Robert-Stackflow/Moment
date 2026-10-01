import { Suspense } from "react";
import { NavLink, Paper } from "@mantine/core";
import { Fingerprint, KeyRound, Monitor, UserRound } from "lucide-react";
import { NavLink as RouterLink, Outlet, useLocation } from "react-router-dom";
import { Loading, PageTitle } from "./Common";

const sections = [
  { path: "/account", label: "账户资料", icon: UserRound },
  { path: "/account/security", label: "登录安全", icon: Fingerprint },
  { path: "/account/password", label: "修改密码", icon: KeyRound },
  { path: "/account/sessions", label: "登录会话", icon: Monitor },
];

export default function AccountLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <PageTitle title="我的账户" />
      <div className="settings-layout account-layout">
        <Paper
          component="nav"
          aria-label="账户设置"
          withBorder
          p="xs"
          className="settings-navigation account-navigation"
        >
          {sections.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              component={RouterLink}
              to={path}
              end
              label={label}
              leftSection={<Icon size={18} />}
              active={pathname.replace(/\/$/, "") === path}
              className="studio-nav"
            />
          ))}
        </Paper>
        <div className="account-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </>
  );
}

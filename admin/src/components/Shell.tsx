import {
  AppShell,
  Avatar,
  Button,
  MenuItem,
  Popover,
  Segmented,
  type NavigationGroup,
} from "@robert-stackflow/oneui";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronsUpDown,
  FilePenLine,
  FolderTree,
  Grid2X2,
  Images,
  Link2,
  LogOut,
  Monitor,
  Moon,
  ScanSearch,
  Settings2,
  Sun,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { notifyError } from "../api";
import { useAppearance } from "../appearance";
import { useAuth } from "../session";
import { Brand } from "./Brand";
const navItem = (label: string, path: string, Icon: LucideIcon) => ({
  id: path,
  path,
  label,
  icon: <Icon />,
});
const navigationGroups: NavigationGroup[] = [
  { id: "overview", items: [navItem("工作台", "/workbench", Grid2X2)] },
  {
    id: "content",
    label: "内容管理",
    items: [
      navItem("帖子与图片", "/posts", Images),
      navItem("草稿", "/drafts", FilePenLine),
      navItem("定时发布", "/schedules", CalendarClock),
      navItem("分类管理", "/categories", FolderTree),
    ],
  },
  {
    id: "photos",
    label: "照片工具",
    items: [
      navItem("照片整理", "/organize", ScanSearch),
      navItem("分享相册", "/shares", Link2),
      navItem("回收站", "/trash", Trash2),
    ],
  },
  {
    id: "manage",
    label: "管理",
    items: [
      navItem("网站设置", "/settings/meta", Settings2),
      navItem("我的账户", "/account", UserRound),
    ],
  },
];
const items = navigationGroups.flatMap((group) => group.items);
function AccountFooter() {
  const auth = useAuth(),
    navigate = useNavigate(),
    { mode, setMode } = useAppearance(),
    [open, setOpen] = useState(false),
    anchor = useRef<HTMLButtonElement>(null);
  async function logout() {
    try {
      await auth.logout();
      setOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error);
    }
  }
  return (
    <div className="sidebar-footer">
      <Button
        variant="ghost"
        className="footer-website app-button-layout"
        href="/"
        target="_blank"
        rel="noreferrer"
      >
        查看网站 <ArrowUpRight size={15} />
      </Button>
      <Segmented
        label="颜色模式"
        value={mode}
        onChange={setMode}
        options={[
          {
            value: "light",
            label: (
              <>
                <Sun size={14} />
                浅色
              </>
            ),
          },
          {
            value: "dark",
            label: (
              <>
                <Moon size={14} />
                深色
              </>
            ),
          },
          {
            value: "system",
            label: (
              <>
                <Monitor size={14} />
                系统
              </>
            ),
          },
        ]}
      />
      <Button
        variant="ghost"
        className="account-switch app-button-layout"
        ref={anchor}
        aria-label="账户菜单"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar
          name={auth.user?.alias || auth.user?.username || "账户"}
          src={auth.user?.avatar || undefined}
          size={34}
        />
        <span className="account-label">
          <strong>{auth.user?.alias || auth.user?.username}</strong>
          {auth.user?.alias && auth.user.alias !== auth.user.username && (
            <small>@{auth.user.username}</small>
          )}
        </span>
        <ChevronsUpDown size={15} />
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        role="menu"
        label="账户菜单"
        width={220}
      >
        <MenuItem
          label="账户设置"
          icon={<UserRound />}
          onClick={() => {
            setOpen(false);
            navigate("/account");
          }}
        />
        <MenuItem
          label="退出登录"
          tone="danger"
          icon={<LogOut />}
          onClick={() => void logout()}
        />
      </Popover>
    </div>
  );
}
const locationOrigin = () => window.location.origin;
export function Shell() {
  const location = useLocation(),
    navigate = useNavigate();
  const selected = [...items]
    .reverse()
    .find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(item.path.replace(/\/meta$/, "") + "/"),
    );
  return (
    <AppShell
      navigation={items}
      navigationGroups={navigationGroups}
      active={selected?.path || "/workbench"}
      title={selected?.label || "Moment"}
      brandName="Moment"
      brand={<Brand wordmark />}
      homePath="/workbench"
      basePath="/admin"
      showHeader={false}
      onNavigate={navigate}
      sidebarFooter={<AccountFooter />}
    >
      <div
        className="moment-content"
        onClick={(event) => {
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
            "a[href]",
          );
          if (
            !link ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            link.target ||
            link.hasAttribute("download")
          )
            return;
          const url = new URL(link.href);
          if (
            url.origin === locationOrigin() &&
            url.pathname.startsWith("/admin/")
          ) {
            event.preventDefault();
            navigate(url.pathname.slice(6) + url.search + url.hash);
          }
        }}
      >
        <Outlet />
      </div>
    </AppShell>
  );
}

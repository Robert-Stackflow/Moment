import {
  ActionIcon,
  Avatar,
  Drawer,
  Menu,
  NavLink,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ArrowUpRight,
  Grid2X2,
  Images,
  FilePenLine,
  FolderTree,
  Settings2,
  UserRound,
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronsUpDown,
  PanelLeft,
  X,
} from "lucide-react";
import {
  Link,
  NavLink as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../session";
import { notifyError } from "../api";
import { Brand } from "./Brand";

const items = [
  { label: "工作台", path: "/workbench", icon: Grid2X2 },
  { label: "帖子与图片", path: "/posts", icon: Images },
  { label: "草稿", path: "/drafts", icon: FilePenLine },
  { label: "分类管理", path: "/categories", icon: FolderTree },
  { label: "网站设置", path: "/settings/meta", icon: Settings2 },
  { label: "我的账户", path: "/account", icon: UserRound },
];

function Sidebar({
  onNavigate,
  mobile = false,
}: {
  onNavigate: () => void;
  mobile?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  async function logout() {
    try {
      await auth.logout();
      onNavigate();
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error);
    }
  }
  return (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <Link to="/workbench" aria-label="Moment 工作台" onClick={onNavigate}>
          <Brand wordmark />
        </Link>
        {mobile && (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="关闭导航"
            onClick={onNavigate}
          >
            <X size={18} />
          </ActionIcon>
        )}
      </div>
      <ScrollArea className="sidebar-navigation" scrollbarSize={3}>
        <Stack gap={5}>
          {items.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              component={RouterLink}
              to={path}
              label={label}
              leftSection={<Icon size={19} strokeWidth={1.7} />}
              active={
                path.startsWith("/settings")
                  ? location.pathname.startsWith("/settings")
                  : location.pathname.startsWith(path)
              }
              onClick={onNavigate}
              className="studio-nav"
            />
          ))}
        </Stack>
      </ScrollArea>
      <div className="sidebar-bottom">
        <a className="visit-site" href="/" target="_blank" rel="noopener">
          <span>查看网站</span>
          <ArrowUpRight size={16} />
        </a>
        <SegmentedControl
          className="theme-switch"
          aria-label="外观主题"
          fullWidth
          value={colorScheme}
          onChange={(value) =>
            setColorScheme(value as "light" | "dark" | "auto")
          }
          data={[
            {
              value: "light",
              label: (
                <span className="theme-option">
                  <Sun size={14} />
                  浅色
                </span>
              ),
            },
            {
              value: "dark",
              label: (
                <span className="theme-option">
                  <Moon size={14} />
                  深色
                </span>
              ),
            },
            {
              value: "auto",
              label: (
                <span className="theme-option">
                  <Monitor size={14} />
                  系统
                </span>
              ),
            },
          ]}
        />
        <Menu position="top-start" width={212} offset={10}>
          <Menu.Target>
            <UnstyledButton className="account-switch" aria-label="账户菜单">
              <Avatar
                src={auth.user?.avatar || undefined}
                size={34}
                radius={11}
                color="victoria"
              >
                {auth.user?.username.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="account-label">
                <Text fw={600} size="sm" truncate>
                  {auth.user?.alias || auth.user?.username}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  @{auth.user?.username}
                </Text>
              </span>
              <ChevronsUpDown size={15} />
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>账户</Menu.Label>
            <Menu.Item
              leftSection={<UserRound size={16} />}
              onClick={() => {
                onNavigate();
                navigate("/account");
              }}
            >
              账户设置
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<LogOut size={16} />}
              onClick={() => void logout()}
            >
              退出登录
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
}

export function Shell() {
  const [opened, { open, close }] = useDisclosure();
  const location = useLocation();
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Sidebar onNavigate={close} />
      </aside>
      <ActionIcon
        className="mobile-nav-toggle"
        variant="default"
        size={40}
        radius={12}
        aria-label="打开导航"
        onClick={open}
      >
        <PanelLeft size={19} />
      </ActionIcon>
      <Drawer
        opened={opened}
        onClose={close}
        size={272}
        padding={0}
        withCloseButton={false}
        classNames={{ content: "mobile-sidebar", body: "mobile-sidebar-body" }}
      >
        <Sidebar mobile onNavigate={close} />
      </Drawer>
      <main className="studio-main">
        <div className="page-content page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

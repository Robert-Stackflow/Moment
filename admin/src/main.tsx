import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "./styles.css";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Navigate,
  Outlet,
  Route,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme, Loader, Center } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider, RequireAuth } from "./session";
import { Shell } from "./components/Shell";
import { Login } from "./pages/Login";
import { ControlTooltips } from "./components/ControlTooltips";
import { PendingChangesProvider } from "./components/PendingChanges";
import { ChevronDown } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Posts = lazy(() => import("./pages/Posts"));
const Editor = lazy(() => import("./pages/Editor"));
const NewPost = lazy(() =>
  import("./pages/Editor").then((module) => ({ default: module.NewPost })),
);
const Drafts = lazy(() => import("./pages/Drafts"));
const Categories = lazy(() => import("./pages/Categories"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Account = lazy(() => import("./pages/Account"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
  },
});
const theme = createTheme({
  respectReducedMotion: true,
  primaryColor: "victoria",
  colors: {
    dark: [
      "#e9edf5",
      "#c8d0e0",
      "#a4b0c5",
      "#7c8ba4",
      "#526078",
      "#344057",
      "#242e40",
      "#1b2332",
      "#141b27",
      "#0d131d",
    ],
    victoria: [
      "#edf1fb",
      "#dce4f7",
      "#bdcbee",
      "#98ace0",
      "#718bd1",
      "#526dc0",
      "#4059aa",
      "#354b91",
      "#2c3f78",
      "#25355f",
    ],
  },
  fontFamily:
    'Inter, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  defaultRadius: "md",
  headings: { fontWeight: "650" },
  components: {
    CloseButton: { defaultProps: { "aria-label": "关闭" } },
    PasswordInput: {
      defaultProps: {
        visibilityToggleButtonProps: { "aria-label": "显示或隐藏密码" },
      },
    },
    Pagination: {
      defaultProps: {
        getControlProps: (control: string) => ({
          "aria-label": (
            {
              next: "下一页",
              previous: "上一页",
              first: "第一页",
              last: "最后一页",
            } as Record<string, string>
          )[control],
        }),
      },
    },
    Button: { defaultProps: { radius: 10 } },
    Paper: { defaultProps: { radius: 16 } },
    Input: { defaultProps: { radius: 10 } },
    Menu: {
      defaultProps: {
        transitionProps: {
          transition: "pop-top-left",
          duration: 170,
          timingFunction: "cubic-bezier(.2,.7,.2,1)",
        },
      },
    },
    Select: {
      defaultProps: {
        rightSection: <ChevronDown size={15} className="select-chevron" />,
        clearButtonProps: { "aria-label": "清除选择" },
        comboboxProps: {
          transitionProps: {
            transition: "fade-down",
            duration: 160,
            timingFunction: "cubic-bezier(.2,.7,.2,1)",
          },
        },
      },
    },
    MultiSelect: {
      defaultProps: {
        comboboxProps: {
          transitionProps: {
            transition: "fade-down",
            duration: 160,
            timingFunction: "cubic-bezier(.2,.7,.2,1)",
          },
        },
      },
    },
    Modal: {
      defaultProps: {
        transitionProps: {
          transition: "pop",
          duration: 190,
          timingFunction: "cubic-bezier(.2,.7,.2,1)",
        },
        overlayProps: { backgroundOpacity: 0.35, blur: 4 },
      },
    },
    Drawer: {
      defaultProps: {
        transitionProps: {
          duration: 240,
          timingFunction: "cubic-bezier(.2,.7,.2,1)",
        },
        overlayProps: { backgroundOpacity: 0.3, blur: 3 },
      },
    },
    SegmentedControl: {
      defaultProps: {
        transitionDuration: 190,
        transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)",
      },
    },
  },
});

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <AuthProvider>
          <Suspense
            fallback={
              <Center mih={300}>
                <Loader aria-label="加载页面" />
              </Center>
            }
          >
            <Outlet />
          </Suspense>
        </AuthProvider>
      }
    >
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="workbench" element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/new" element={<NewPost />} />
          <Route path="posts/:id" element={<Editor />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="drafts/:draftID" element={<Editor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings/:section" element={<SettingsPage />} />
          <Route path="account" element={<Account />} />
          <Route
            path="content/blog"
            element={<Navigate to="/posts" replace />}
          />
          <Route
            path="content/category"
            element={<Navigate to="/categories" replace />}
          />
          <Route path="profile" element={<Navigate to="/account" replace />} />
          {["meta", "general", "content", "storage"].map((section) => (
            <Route
              key={section}
              path={`system/${section}`}
              element={<Navigate to={`/settings/${section}`} replace />}
            />
          ))}
          <Route
            path="*"
            element={
              <Center mih={300}>
                <div>
                  <h2>找不到这个页面</h2>
                  <a href="/admin/workbench">返回工作台</a>
                </div>
              </Center>
            }
          />
        </Route>
      </Route>
    </Route>,
  ),
  { basename: "/admin" },
);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ControlTooltips />
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <PendingChangesProvider>
          <RouterProvider router={router} />
        </PendingChangesProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);

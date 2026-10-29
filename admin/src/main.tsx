import {
  LoadingState,
  Button,
  EmptyState,
  ToastProvider,
  UIProvider,
} from "@robert-stackflow/oneui";
import "@robert-stackflow/oneui/styles/base.css";
import "@robert-stackflow/oneui/styles/themes.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from "react-router-dom";
import { AppearanceProvider } from "./appearance";
import { PendingChangesProvider } from "./components/PendingChanges";
import { Shell } from "./components/Shell";
import { OrganizeLayout } from "./components/OrganizeLayout";
import { notifications } from "./notifications";
import { Login } from "./pages/Login";
import { AuthProvider, RequireAuth } from "./session";
import "./styles.css";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Posts = lazy(() => import("./pages/Posts"));
const Editor = lazy(() => import("./pages/Editor"));
const NewPost = lazy(() =>
  import("./pages/Editor").then((module) => ({ default: module.NewPost })),
);
const Drafts = lazy(() => import("./pages/Drafts"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Trash = lazy(() => import("./pages/Trash"));
const Shares = lazy(() => import("./pages/Shares"));
const ShareEditor = lazy(() => import("./pages/ShareEditor"));
const Categories = lazy(() => import("./pages/Categories"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Account = lazy(() => import("./pages/Account"));
const Security = lazy(() => import("./pages/Security"));
const AccountLayout = lazy(() => import("./components/AccountLayout"));
const Password = lazy(() => import("./pages/Password"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Duplicates = lazy(() => import("./pages/Duplicates"));
const SmartTags = lazy(() => import("./pages/SmartTags"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: false, refetchOnWindowFocus: false },
  },
});
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <AuthProvider>
          <Suspense
            fallback={
              <LoadingState label="加载页面" showLabel={false} fullPage />
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
          <Route path="schedules" element={<Schedules />} />
          <Route path="organize" element={<OrganizeLayout />}>
            <Route index element={<Navigate to="duplicates" replace />} />
            <Route path="duplicates" element={<Duplicates />} />
            <Route path="tags" element={<SmartTags />} />
          </Route>
          <Route path="trash" element={<Trash />} />
          <Route path="shares" element={<Shares />} />
          <Route path="shares/new" element={<ShareEditor />} />
          <Route path="shares/:id" element={<ShareEditor />} />
          <Route path="drafts/:draftID" element={<Editor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings/:section" element={<SettingsPage />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<Account />} />
            <Route path="security" element={<Security />} />
            <Route path="password" element={<Password />} />
            <Route path="sessions" element={<Sessions />} />
          </Route>
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
              <EmptyState
                title="找不到这个页面"
                action={<Button href="/admin/workbench">返回工作台</Button>}
              />
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
    <AppearanceProvider>
      <UIProvider toastPosition="top-right">
        <ToastProvider controller={notifications}>
          <QueryClientProvider client={queryClient}>
            <PendingChangesProvider>
              <RouterProvider router={router} />
            </PendingChangesProvider>
          </QueryClientProvider>
        </ToastProvider>
      </UIProvider>
    </AppearanceProvider>
  </StrictMode>,
);

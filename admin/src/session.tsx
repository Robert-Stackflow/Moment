import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Alert, Button, Center, Loader, Stack } from "@mantine/core";
import { api, ApiError, json } from "./api";
import type { User } from "./types";

interface Auth {
  user?: User;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<unknown>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/me"),
    retry: false,
  });
  useEffect(() => {
    const expired = () => {
      void client.invalidateQueries({ queryKey: ["me"] });
    };
    window.addEventListener("moment-session-expired", expired);
    return () => window.removeEventListener("moment-session-expired", expired);
  }, [client]);
  const value: Auth = {
    user: me.data?.data,
    loading: me.isPending,
    error: me.error,
    refresh: me.refetch,
    login: async (username, password) => {
      await api("/login", json("POST", { username, password }));
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
      await me.refetch({ throwOnError: true });
    },
    logout: async () => {
      await api("/logout", json("POST", {}));
      await client.cancelQueries();
      client.setQueryData(["me"], { code: 200, msg: "OK", data: undefined });
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Authentication provider missing");
  return auth;
}
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <Center mih={400}>
        <Loader aria-label="正在验证登录" />
      </Center>
    );
  if (
    auth.error &&
    !(auth.error instanceof ApiError && auth.error.status === 401)
  )
    return (
      <Center mih={400}>
        <Stack>
          <Alert color="red">无法连接后台，请确认服务正在运行。</Alert>
          <Button onClick={() => void auth.refresh()}>重新连接</Button>
        </Stack>
      </Center>
    );
  if (
    !auth.user ||
    (auth.error instanceof ApiError && auth.error.status === 401)
  )
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

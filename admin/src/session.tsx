import { Alert, Button, Spinner } from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api, ApiError, json } from "./api";
import { authenticatePasskey } from "./passkeys";
import type { User } from "./types";
import { tone } from "./ui-data";
interface Auth {
  user?: User;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<unknown>;
  login: (username: string, password: string) => Promise<void>;
  loginWithPasskey: (
    signal: AbortSignal,
    onVerified: () => void,
  ) => Promise<void>;
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
  async function completeLogin() {
    await client.cancelQueries({
      predicate: (query) => query.queryKey[0] !== "me",
    });
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    await me.refetch({ throwOnError: true });
  }
  const value: Auth = {
    user:
      me.error instanceof ApiError && me.error.status === 401
        ? undefined
        : me.data?.data,
    loading: me.isPending,
    error: me.error,
    refresh: me.refetch,
    login: async (username, password) => {
      await api("/login", json("POST", { username, password }));
      await completeLogin();
    },
    loginWithPasskey: async (signal, onVerified) => {
      await authenticatePasskey(signal, onVerified);
      await completeLogin();
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
      <div
        className="ui-center"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <Spinner aria-label="正在验证登录" />
      </div>
    );
  if (
    auth.error &&
    !(auth.error instanceof ApiError && auth.error.status === 401)
  )
    return (
      <div
        className="ui-center"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Alert tone={tone("red")}>无法连接后台，请确认服务正在运行。</Alert>
          <Button onClick={() => void auth.refresh()} variant="primary">
            重新连接
          </Button>
        </div>
      </div>
    );
  if (
    !auth.user ||
    (auth.error instanceof ApiError && auth.error.status === 401)
  )
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { Settings } from "../types";

export function DocumentTitle() {
  const publicMeta = useQuery({
    queryKey: ["public-meta"],
    queryFn: async (): Promise<Record<string, unknown>> => {
      const response = await fetch("/api/v1/visitor/settings/meta");
      const result = await response.json();
      if (!response.ok || result.code !== 200)
        throw new Error("网站信息暂不可用");
      return result.data;
    },
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
    enabled: false,
  });
  const meta = settings.data?.data.meta || publicMeta.data;
  const name = String(meta?.site_name || import.meta.env.VITE_SITE_NAME || "Moment").trim();
  const splitter = String(meta?.site_splitter || import.meta.env.VITE_SITE_SPLITTER || "|").trim();
  useEffect(() => {
    document.title = [name, splitter, "管理后台"].filter(Boolean).join(" ");
  }, [name, splitter]);
  return null;
}

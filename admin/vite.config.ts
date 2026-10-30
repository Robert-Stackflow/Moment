import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const siteDefaults = loadEnv(mode, fileURLToPath(new URL("../web", import.meta.url)), "VITE_");
  return {
  define: {
    "import.meta.env.VITE_SITE_NAME": JSON.stringify(siteDefaults.VITE_TITLE || "Moment"),
    "import.meta.env.VITE_SITE_SPLITTER": JSON.stringify(siteDefaults.VITE_TITLE_SPLITTER || "|"),
  },
  base: "/admin/",
  cacheDir: process.env.MOMENT_UI_TEST_CACHE || undefined,
  plugins: [react()],
  worker: { format: "es" },
  server: {
    port: 5174,
    proxy: {
      "/_AMapService": { target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999" },
      "/api": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
        changeOrigin: false,
      },
      "/uploads": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
      },
      "/thumbnails": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
      },
      "/avatars": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
      },
      "/assets": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
      },
    },
  },
  build: { outDir: "../dist/admin", emptyOutDir: true },
  };
});

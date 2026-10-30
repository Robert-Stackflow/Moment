import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
});

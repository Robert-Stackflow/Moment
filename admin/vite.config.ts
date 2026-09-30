import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: process.env.MOMENT_DEV_API || "http://127.0.0.1:9999",
        changeOrigin: false,
      },
      "/uploads": {
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

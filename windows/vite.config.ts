import { defineConfig } from "vite";
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: "127.0.0.1", watch: { ignored: ["**/target/**", "**/dist/**", "**/test-results/**"] } },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: { target: "chrome110", minify: "esbuild", sourcemap: false, emptyOutDir: true },
});


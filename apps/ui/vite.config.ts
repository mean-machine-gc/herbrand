import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { herbrandSpecsPlugin } from "./src/vite-plugin.js";

export default defineConfig({
  plugins: [
    react(),
    herbrandSpecsPlugin(),
  ],
});

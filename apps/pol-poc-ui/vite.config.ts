import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { herbrandSpecsPlugin } from './src/vite-plugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), herbrandSpecsPlugin()],
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'node:path';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
    target: 'esnext',
    rollupOptions: {
      // graph/index.html は manifest の web_accessible_resources からしか参照されないため
      // crxjs に静的コピーされて <script src="./main.tsx"> のまま残ってしまう。
      // 明示的に input に追加して通常の HTML エントリとしてビルドさせる。
      input: {
        graph: resolve(__dirname, 'src/graph/index.html'),
      },
    },
  },
});

import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the NestJS backend so the frontend can call relative
      // URLs and avoid CORS in dev.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      // Static assets (instructor portraits) live under /uploads on the
      // backend. Proxy them too so the frontend can use the relative URL
      // returned by the API as-is.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Socket.IO realtime endpoint — `ws: true` upgrades the proxy to
      // forward the WebSocket handshake. Lets the FE client use a relative
      // URL in dev (matches prod, where the API serves HTTP and WS on the
      // same origin).
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

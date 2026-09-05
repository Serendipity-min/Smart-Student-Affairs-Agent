import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 开发期同源转发到本地网关，避免浏览器需要任何 FastGPT 认证信息。
    proxy: { '/api': 'http://127.0.0.1:8787' }
  }
});

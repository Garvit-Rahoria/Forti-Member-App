import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:7000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://backend:7000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://backend:7000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

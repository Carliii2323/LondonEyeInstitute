import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // El front pega a /api (relativo) y Vite lo reenvia al backend Go.
    // Asi todo queda en un solo origen -> se puede exponer con un solo puerto
    // (Tailscale) sin CORS ni mixed-content.
    proxy: {
      '/api': 'http://localhost:8080',
      // Los avatares se sirven desde el backend (/uploads/avatars/...). Sin este
      // proxy el navegador los pide al dev server de Vite y da 404 -> foto rota.
      '/uploads': 'http://localhost:8080',
    },
    // Permite servir bajo el hostname de Tailscale (Funnel/Serve).
    allowedHosts: ['.ts.net'],
  },
})

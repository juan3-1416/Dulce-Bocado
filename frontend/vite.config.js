import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,

    proxy: {
      // Las vistas legadas usan rutas relativas y CSRF contra el monolito.
      // Ventas y los demás módulos migrados usan VITE_API_URL (Gateway).
      // No cambiar /api completo al Gateway: /api/productos coincide en ambos.
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },

      '/sanctum': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})

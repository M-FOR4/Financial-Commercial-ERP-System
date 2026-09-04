import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Production builds must know where the API lives. Fail loudly here instead of
  // silently baking in http://localhost:8000 (the dev fallback in src/services/api.ts),
  // which would point the deployed frontend at the visitor's own machine.
  if (command === 'build' && !process.env.VITE_API_BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL is required for production builds. ' +
      'Set it to the deployed backend URL, e.g. https://erp-backend.onrender.com ' +
      '(or http://localhost:8000 for a local production build).'
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5371,
      strictPort: true,
      host: true,
    },
  }
})
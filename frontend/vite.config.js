import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: ['modesto-nongenerating-painedly.ngrok-free.dev'],
    proxy: {
      '/predict': 'http://localhost:5000',
      '/generate_report': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/results': 'http://localhost:5000',
      '/health': 'http://localhost:5000'
    }
  }
})

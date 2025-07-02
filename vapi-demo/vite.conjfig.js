// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 4173,
    allowedHosts: ['voice-ai-frontend-1vbf.onrender.com'] 
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
